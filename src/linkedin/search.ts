import type { Page } from 'playwright';
import type { PostCandidate } from '../types.js';
import { isCaptchaPage, CaptchaError } from './captcha.js';

// Reaction button aria-label contains this substring for both liked and unliked states
const REACTION_BTN_ATTR = 'eaction button state';

export function buildHashtagUrl(tag: string): string {
  const clean = tag.replace(/^#/, '');
  return `https://www.linkedin.com/search/results/content/?keywords=${encodeURIComponent('#' + clean)}&origin=FACETED_SEARCH&sortBy=%22date_posted%22`;
}

/**
 * Derive a stable synthetic post ID from listitem innerText.
 * Format: "Feed post | NAME |  • 2nd | TITLE | TIME • | Follow | BODY..."
 * We normalise whitespace, take author + first 120 chars of body.
 */
export function derivePostId(rawText: string): string {
  const normalised = rawText.replace(/\n+/g, ' | ').trim();
  const parts = normalised.split('|').map(s => s.trim());
  const author = parts[1] ?? 'unknown';
  // body starts after the first ~5 pipe segments (header metadata)
  const body = parts.slice(5).join(' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  const key = `${author}::${body || normalised.slice(0, 80)}`.replace(/\s+/g, ' ');
  return key.slice(0, 200);
}

export async function searchHashtag(
  page: Page,
  hashtag: string,
  maxPosts = 20
): Promise<PostCandidate[]> {
  const tag = hashtag.replace(/^#/, '');
  const url = buildHashtagUrl(tag);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  if (await isCaptchaPage(page)) {
    throw new CaptchaError(page.url());
  }

  // Wait for at least one reaction button to appear
  try {
    await page.waitForSelector(`button[aria-label*="${REACTION_BTN_ATTR}"]`, { timeout: 20000 });
  } catch {
    console.warn(`No posts found for #${tag} (reaction-button timeout)`);
    return [];
  }

  // Scroll twice to load more posts
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(2000);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(2000);

  const raw = await page.evaluate(
    ({ reactionAttr, limit }: { reactionAttr: string; limit: number }) => {
      const items = document.querySelectorAll('[role="listitem"]');
      const results: Array<{
        post_id: string;
        author: string;
        body: string;
        alreadyLiked: boolean;
        engagement: number;
      }> = [];

      for (let idx = 0; idx < items.length && results.length < limit; idx++) {
        const li = items[idx] as HTMLElement;
        const reactBtn = li.querySelector(
          `button[aria-label*="${reactionAttr}"]`
        ) as HTMLButtonElement | null;
        if (!reactBtn) continue;

        const ariaLabel = reactBtn.getAttribute('aria-label') ?? '';
        const alreadyLiked = !ariaLabel.toLowerCase().includes('no reaction');

        // innerText gives the full rendered text of the card
        const raw = li.innerText.replace(/\n+/g, ' | ').trim();
        const parts = raw.split('|').map((s: string) => s.trim());
        const author = parts[1] ?? 'unknown';
        const body = parts
          .slice(5)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 200);

        const post_id = `${author}::${(body || raw.slice(0, 80)).replace(/\s+/g, ' ')}`.slice(0, 200);

        // Try to extract engagement count (reactions)
        const reactionsEl = li.querySelector(
          'button[aria-label*="View reactions"], [aria-label*="reaction"]'
        ) as HTMLElement | null;
        let engagement = 0;
        if (reactionsEl) {
          const m = (reactionsEl.getAttribute('aria-label') ?? reactionsEl.innerText)
            .replace(/,/g, '')
            .match(/(\d+)/);
          if (m) engagement = parseInt(m[1], 10);
        }

        results.push({ post_id, author, body, alreadyLiked, engagement });
      }

      return results;
    },
    { reactionAttr: REACTION_BTN_ATTR, limit: maxPosts }
  );

  return raw.map(p => ({
    postId: p.post_id,
    author: p.author,
    authorUrn: '',
    url: '',          // no reliable URN — liking happens in same page session
    hashtag: `#${tag}`,
    engagement: p.engagement,
    alreadyLiked: p.alreadyLiked,
    text: p.body,
  }));
}
