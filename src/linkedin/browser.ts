import { chromium, type BrowserContext } from 'playwright';
import { forgePaths } from '../core/paths.js';

export async function getBrowserContext(): Promise<BrowserContext> {
  const { chromeProfile } = forgePaths();

  return await chromium.launchPersistentContext(chromeProfile, {
    headless: false, // CRITICAL: real visible Chrome — do NOT change to headless
    viewport: { width: 1280, height: 800 },
    // userAgent: undefined means Playwright uses the real Chromium UA
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-default-browser-check',
      '--disable-extensions-except',
    ],
  });
}

export async function getOrCreatePage(ctx: BrowserContext) {
  const pages = ctx.pages();
  return pages.length > 0 ? pages[0] : await ctx.newPage();
}
