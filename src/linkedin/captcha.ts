import type { Page } from 'playwright';

// URL path patterns that indicate LinkedIn security challenge
const CAPTCHA_URL_PATTERNS = [
  '/checkpoint/',
  '/captcha',
  '/uas/login',
  '/security',
  '/challenge/',
];

// DOM selectors that indicate a captcha/challenge is present
const CAPTCHA_SELECTORS = [
  'form[id="captcha-challenge"]',
  '[data-test-id="captcha"]',
  '[data-challenge-id]',
];

// Page title substrings (case-insensitive)
const CAPTCHA_TITLE_PATTERNS = [
  'security verification',
  'security check',
  'confirm',
  'challenge',
  'verify',
];

export async function isCaptchaPage(page: Page): Promise<boolean> {
  try {
    const url = page.url().toLowerCase();
    if (CAPTCHA_URL_PATTERNS.some(p => url.includes(p))) return true;

    const title = (await page.title()).toLowerCase();
    if (CAPTCHA_TITLE_PATTERNS.some(p => title.includes(p))) return true;

    for (const sel of CAPTCHA_SELECTORS) {
      const el = await page.$(sel);
      if (el) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export class CaptchaError extends Error {
  constructor(url: string) {
    super(`Captcha/challenge detected at ${url} — stopping session`);
    this.name = 'CaptchaError';
  }
}

// For testing — exported URL pattern list
export const captchaUrlPatterns = CAPTCHA_URL_PATTERNS;
export const captchaSelectors = CAPTCHA_SELECTORS;
export const captchaTitlePatterns = CAPTCHA_TITLE_PATTERNS;
