import type { Page } from 'playwright';
import type { LikeResult } from '../types.js';
import { isCaptchaPage, CaptchaError } from './captcha.js';
import { derivePostId } from './search.js';

// Reaction button aria-label substring — stable across obfuscated class renames
const REACTION_ATTR = 'eaction button state';

/**
 * Like a post that is already visible on the current search-results page.
 *
 * Strategy: iterate all [role="listitem"] that contain a reaction button.
 * Match by re-deriving post_id from innerText and compare to candidate.postId.
 * Click the reaction button when a match is found and it has not been liked yet.
 *
 * Returns a LikeResult. Never navigates away from the current page.
 */
export async function likePostInPage(
  page: Page,
  targetPostId: string
): Promise<LikeResult> {
  try {
    if (await isCaptchaPage(page)) {
      throw new CaptchaError(page.url());
    }

    const items = await page
      .locator(`[role="listitem"]:has(button[aria-label*="${REACTION_ATTR}"])`)
      .all();

    for (const item of items) {
      const rawText = await item.innerText().catch(() => '');
      if (!rawText) continue;

      const derivedId = derivePostId(rawText);
      if (derivedId !== targetPostId) continue;

      // Found matching post
      const reactBtn = item.locator(`button[aria-label*="${REACTION_ATTR}"]`).first();
      const ariaLabel = (await reactBtn.getAttribute('aria-label')) ?? '';
      const alreadyLiked = !ariaLabel.toLowerCase().includes('no reaction');

      if (alreadyLiked) {
        return { success: false, alreadyLiked: true, captchaDetected: false };
      }

      await reactBtn.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200 + Math.floor(Math.random() * 400));
      await reactBtn.click();
      await page.waitForTimeout(800 + Math.floor(Math.random() * 700));

      if (await isCaptchaPage(page)) {
        throw new CaptchaError(page.url());
      }

      return { success: true, alreadyLiked: false, captchaDetected: false };
    }

    // Post not found on current page
    return {
      success: false,
      alreadyLiked: false,
      captchaDetected: false,
      error: 'post-not-found-on-page',
    };
  } catch (e) {
    if (e instanceof CaptchaError) {
      return { success: false, alreadyLiked: false, captchaDetected: true, error: e.message };
    }
    return {
      success: false,
      alreadyLiked: false,
      captchaDetected: false,
      error: (e as Error).message,
    };
  }
}

/**
 * Legacy per-URL like — kept as fallback for company/network commands.
 * NOT used by the hashtag run loop (which calls likePostInPage instead).
 */
export async function likePost(page: Page, postUrl: string): Promise<LikeResult> {
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    if (await isCaptchaPage(page)) {
      throw new CaptchaError(page.url());
    }

    await humanScroll(page);
    await page.waitForTimeout(500 + Math.floor(Math.random() * 1000));

    const reactBtn = page
      .locator(`button[aria-label*="${REACTION_ATTR}"]`)
      .first();

    try {
      await reactBtn.waitFor({ timeout: 10000 });
    } catch {
      return {
        success: false,
        alreadyLiked: false,
        captchaDetected: false,
        error: 'like-button-not-found',
      };
    }

    const ariaLabel = (await reactBtn.getAttribute('aria-label')) ?? '';
    const alreadyLiked = !ariaLabel.toLowerCase().includes('no reaction');
    if (alreadyLiked) {
      return { success: false, alreadyLiked: true, captchaDetected: false };
    }

    await reactBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200 + Math.floor(Math.random() * 400));
    await reactBtn.click();
    await page.waitForTimeout(1000 + Math.floor(Math.random() * 1500));

    if (await isCaptchaPage(page)) {
      throw new CaptchaError(page.url());
    }

    return { success: true, alreadyLiked: false, captchaDetected: false };
  } catch (e) {
    if (e instanceof CaptchaError) {
      return { success: false, alreadyLiked: false, captchaDetected: true, error: e.message };
    }
    return {
      success: false,
      alreadyLiked: false,
      captchaDetected: false,
      error: (e as Error).message,
    };
  }
}

async function humanScroll(page: Page): Promise<void> {
  const scrollAmount = 200 + Math.floor(Math.random() * 600);
  await page.mouse.wheel(0, scrollAmount);
  await page.waitForTimeout(300 + Math.floor(Math.random() * 400));
}

export async function sendTelegramAlert(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    if (!res.ok) {
      console.warn('Telegram alert failed:', res.status);
    }
  } catch (e) {
    console.warn('Telegram alert error:', (e as Error).message);
  }
}
