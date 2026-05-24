import type { Page } from 'playwright';
import { getEnv } from '../core/env.js';
import { isCaptchaPage, CaptchaError } from './captcha.js';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const FEED_URL = 'https://www.linkedin.com/feed/';
const LOGIN_URL = 'https://www.linkedin.com/login';

// Selector for LinkedIn's global nav (present only when logged in)
const LOGGED_IN_SELECTORS = [
  '[data-test-global-nav]',
  '.global-nav',
  '.feed-identity-module',
  'nav[aria-label]',
];

export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.goto(FEED_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const url = page.url();

    // Redirected to login = not logged in
    if (url.includes('/login') || url.includes('/uas/login') || url.includes('/authwall')) {
      return false;
    }

    if (await isCaptchaPage(page)) {
      throw new CaptchaError(url);
    }

    // Check for nav elements present only when logged in
    for (const sel of LOGGED_IN_SELECTORS) {
      try {
        await page.waitForSelector(sel, { timeout: 5000 });
        return true;
      } catch {
        // try next selector
      }
    }

    // If we're on /feed/ without a captcha and no login redirect, assume logged in
    return url.includes('/feed/');
  } catch (e) {
    if (e instanceof CaptchaError) throw e;
    return false;
  }
}

export async function loginInteractive(page: Page): Promise<void> {
  const username = getEnv('LINKEDIN_USERNAME');
  const hasPassword = !!getEnv('LINKEDIN_PASSWORD');

  if (username && hasPassword) {
    await loginWithCredentials(page);
  } else {
    await loginManual(page);
  }
}

async function loginWithCredentials(page: Page): Promise<void> {
  const username = getEnv('LINKEDIN_USERNAME')!;
  const password = getEnv('LINKEDIN_PASSWORD')!;

  console.log('Using credentials from .env (unattended login)...');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });

  try {
    await page.fill('input[name="session_key"]', username, { timeout: 10000 });
    // Small human-like pause
    await page.waitForTimeout(500 + Math.floor(Math.random() * 800));
    await page.fill('input[name="session_password"]', password);
    await page.waitForTimeout(300 + Math.floor(Math.random() * 500));
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(3000);

    const url = page.url();
    if (await isCaptchaPage(page)) {
      console.warn('LinkedIn triggered a challenge after login — please complete it manually.');
      await waitForManualCompletion(page);
    } else if (url.includes('/login') || url.includes('/checkpoint')) {
      console.warn('Login may have failed or needs 2FA — please complete it in the browser.');
      await waitForManualCompletion(page);
    } else {
      console.log('Login successful.');
    }
  } catch (e) {
    console.warn('Auto-fill failed, falling back to manual login:', (e as Error).message);
    await loginManual(page);
  }
}

async function loginManual(page: Page): Promise<void> {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  console.log('\nChromium is open. Log in to LinkedIn manually, then press Enter here to continue.');
  await waitForManualCompletion(page);
}

async function waitForManualCompletion(page: Page): Promise<void> {
  const rl = readline.createInterface({ input, output });
  await rl.question('Press Enter once you are logged in...');
  rl.close();

  // Verify login succeeded
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    throw new Error('Still not logged in after manual completion. Run `forge-linkedin login` again.');
  }
  console.log('Session verified. Cookies saved to ~/.forge-linkedin/chrome-profile/');
}

export async function getMyUrn(page: Page): Promise<string | null> {
  try {
    // LinkedIn encodes user URN in the /in/me redirect
    await page.goto('https://www.linkedin.com/in/me/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    const finalUrl = page.url();
    // Extract username from /in/<username>/
    const match = finalUrl.match(/linkedin\.com\/in\/([^/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
