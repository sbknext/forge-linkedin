import type { Page } from 'playwright';
import type { PostCandidate } from '../types.js';
import { isCaptchaPage, CaptchaError } from './captcha.js';

const POST_SELECTOR = '.feed-shared-update-v2, [data-urn^="urn:li:activity:"]';
const POST_TIMEOUT = 15000;

export async function searchHashtag(
  page: Page,
  hashtag: string,
  maxPosts = 20
): Promise<PostCandidate[]> {
  const tag = hashtag.replace(/^#/, '');
  const url = `https://www.linkedin.com/feed/hashtag/${encodeURIComponent(tag)}/`;

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

  if (await isCaptchaPage(page)) {
    throw new CaptchaError(page.url());
  }

  try {
    await page.waitForSelector(POST_SELECTOR, { timeout: POST_TIMEOUT });
  } catch {
    console.warn(`No posts found for #${tag} (selector timeout)`);
    return [];
  }

  // Scroll a bit to load more posts
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(1500);

  const posts = await page.$$eval(
    POST_SELECTOR,
    (elements, [tagName, limit]) => {
      const results: Array<{
        postId: string;
        author: string;
        authorUrn: string;
        url: string;
        engagement: number;
        alreadyLiked: boolean;
        text: string;
      }> = [];

      for (const el of elements.slice(0, limit as number)) {
        try {
          // Post URN / ID
          const urn = el.getAttribute('data-urn') ?? '';
          const activityMatch = urn.match(/urn:li:activity:(\d+)/);
          if (!activityMatch) continue;
          const postId = activityMatch[1];

          // Post URL
          const postUrl = `https://www.linkedin.com/feed/update/${urn}/`;

          // Author
          const authorEl =
            el.querySelector('.update-components-actor__name') ??
            el.querySelector('.feed-shared-actor__name') ??
            el.querySelector('[data-test-app-aware-link]');
          const author = authorEl?.textContent?.trim() ?? 'Unknown';

          // Author URN from profile link
          const profileLinkEl = el.querySelector(
            '.update-components-actor__meta a, .feed-shared-actor__container-link'
          );
          const profileHref = profileLinkEl?.getAttribute('href') ?? '';
          const authorUrnMatch = profileHref.match(/\/in\/([^/?]+)/);
          const authorUrn = authorUrnMatch ? authorUrnMatch[1] : '';

          // Engagement count
          const engagementEl =
            el.querySelector('.social-counts-reactions__count') ??
            el.querySelector('[data-test-reactions-count-see-more-btn]') ??
            el.querySelector('.social-details-social-counts__reactions-count');
          let engagement = 0;
          if (engagementEl) {
            const text = engagementEl.textContent?.trim() ?? '0';
            const numMatch = text.replace(/,/g, '').match(/\d+/);
            if (numMatch) engagement = parseInt(numMatch[0], 10);
          }

          // Already liked
          const likeBtn =
            el.querySelector('button[aria-label*="React Like"]') ??
            el.querySelector('button[aria-label*="Like"]') ??
            el.querySelector('.reactions-react-button');
          const alreadyLiked =
            likeBtn?.getAttribute('aria-pressed') === 'true' ||
            likeBtn?.classList.contains('artdeco-button--active') ||
            false;

          // Post text (for keyword filtering)
          const textEl =
            el.querySelector('.feed-shared-update-v2__description') ??
            el.querySelector('.feed-shared-text') ??
            el.querySelector('[data-test-id="main-feed-activity-card__commentary"]');
          const text = textEl?.textContent?.trim() ?? '';

          results.push({
            postId,
            author,
            authorUrn,
            url: postUrl,
            engagement,
            alreadyLiked,
            text,
          });
        } catch {
          // skip malformed post
        }
      }
      return results;
    },
    [tag, maxPosts] as [string, number]
  );

  return posts.map(p => ({ ...p, hashtag: `#${tag}` }));
}
