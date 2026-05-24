import type { Page } from 'playwright';
import type { LikeResult } from '../types.js';
import { isCaptchaPage, CaptchaError } from './captcha.js';

// LinkedIn like button selectors — ordered by specificity / likelihood
const LIKE_BUTTON_SELECTORS = [
  'button[aria-label*="React Like"]',
  'button[aria-label="Like"]',
  '.reactions-react-button',
  'button[data-control-name="like"]',
];

export async function likePost(page: Page, postUrl: string): Promise<LikeResult> {
  try {
    await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    if (await isCaptchaPage(page)) {
      throw new CaptchaError(page.url());
    }

    // Human-like: scroll naturally before interacting
    await humanScroll(page);
    await page.waitForTimeout(500 + Math.floor(Math.random() * 1000));

    // Find the like button
    let likeBtn = null;
    for (const sel of LIKE_BUTTON_SELECTORS) {
      likeBtn = await page.$(sel);
      if (likeBtn) break;
    }

    if (!likeBtn) {
      return { success: false, alreadyLiked: false, captchaDetected: false, error: 'like-button-not-found' };
    }

    // Check if already liked
    const ariaPressed = await likeBtn.getAttribute('aria-pressed');
    if (ariaPressed === 'true') {
      return { success: false, alreadyLiked: true, captchaDetected: false };
    }

    // Click the like button
    await likeBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200 + Math.floor(Math.random() * 400));
    await likeBtn.click();

    // Wait for UI to update
    await page.waitForTimeout(1000 + Math.floor(Math.random() * 1500));

    // Check for captcha that may appear after click
    if (await isCaptchaPage(page)) {
      throw new CaptchaError(page.url());
    }

    // Verify the like was registered
    const updatedBtn = await page.$(LIKE_BUTTON_SELECTORS[0]) ?? await page.$(LIKE_BUTTON_SELECTORS[1]);
    const nowPressed = (await updatedBtn?.getAttribute('aria-pressed')) === 'true';

    return {
      success: true,
      alreadyLiked: false,
      captchaDetected: false,
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
