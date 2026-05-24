import { loadEnv } from '../core/env.js';
import { loadConfig } from '../core/config.js';
import { getDb, wasLiked, recordLike, incrementToday } from '../core/db.js';
import { applyFilter } from '../core/filter.js';
import * as limiter from '../core/limiter.js';
import { getBrowserContext, getOrCreatePage } from '../linkedin/browser.js';
import { isLoggedIn, getMyUrn } from '../linkedin/auth.js';
import { buildHashtagUrl, derivePostId } from '../linkedin/search.js';
import { likePostInPage, sendTelegramAlert } from '../linkedin/engage.js';
import { isCaptchaPage, CaptchaError } from '../linkedin/captcha.js';
import chalk from 'chalk';
import ora from 'ora';

// Reaction button aria-label substring used throughout the run loop
const REACTION_ATTR = 'eaction button state';

export async function run({ dryRun = false }: { dryRun?: boolean } = {}): Promise<void> {
  loadEnv();
  const config = loadConfig();
  const db = getDb();

  // Active hours check
  if (!limiter.canRun(config)) {
    console.log(
      chalk.yellow('Outside active window.'),
      `Active hours: ${config.active_hours[0]}:00–${config.active_hours[1]}:00 ${config.active_tz}`
    );
    return;
  }

  // Quota check
  const quota = limiter.remainingQuota(config, db);
  if (quota <= 0) {
    console.log(
      chalk.yellow('Daily cap reached.'),
      `${config.daily_cap}/${config.daily_cap} likes today.`
    );
    return;
  }

  console.log(dryRun ? chalk.cyan('[dry-run]') : '', `Quota: ${quota} remaining today`);

  // Launch browser
  const spinner = ora('Launching Chromium...').start();
  const ctx = await getBrowserContext();
  const page = await getOrCreatePage(ctx);
  spinner.succeed('Browser ready');

  let liked = 0;
  let quotaUsed = 0;

  try {
    // Auth check
    if (!(await isLoggedIn(page))) {
      console.error(chalk.red('Not logged in.'), 'Run `forge-linkedin login` first.');
      await ctx.close();
      process.exit(1);
    }

    const myUrn = await getMyUrn(page);

    for (const tag of config.hashtags) {
      if (quotaUsed >= quota) break;

      const tagSpinner = ora(`Searching ${tag}...`).start();

      const url = buildHashtagUrl(tag);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

      if (await isCaptchaPage(page)) {
        tagSpinner.fail('Captcha detected — stopping.');
        await sendTelegramAlert('forge-linkedin: captcha detected, session paused.');
        break;
      }

      // Wait for reaction buttons
      try {
        await page.waitForSelector(`button[aria-label*="${REACTION_ATTR}"]`, { timeout: 20000 });
      } catch {
        tagSpinner.warn(`${tag}: no posts found (timeout)`);
        continue;
      }

      // Scroll to load more
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(2000);
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(2000);

      // Collect all visible listitems with reaction buttons
      const items = await page
        .locator(`[role="listitem"]:has(button[aria-label*="${REACTION_ATTR}"])`)
        .all();

      tagSpinner.succeed(`${tag}: ${items.length} candidates`);

      for (const item of items) {
        if (quotaUsed >= quota) break;

        const rawText = await item.innerText().catch(() => '');
        if (!rawText) continue;

        const postId = derivePostId(rawText);
        const reactBtn = item.locator(`button[aria-label*="${REACTION_ATTR}"]`).first();
        const ariaLabel = (await reactBtn.getAttribute('aria-label').catch(() => '')) ?? '';
        const alreadyLiked = !ariaLabel.toLowerCase().includes('no reaction');

        if (alreadyLiked) continue;
        if (wasLiked(db, postId)) continue;

        // Build a minimal PostCandidate for filter
        const normalised = rawText.replace(/\n+/g, ' | ').trim();
        const parts = normalised.split('|').map((s: string) => s.trim());
        const author = parts[1] ?? 'unknown';
        const body = parts.slice(5).join(' ').replace(/\s+/g, ' ').trim();

        // engagement: best-effort parse
        let engagement = 0;
        const reactionsEl = await item
          .locator('button[aria-label*="View reactions"], [aria-label*="reaction"]')
          .first()
          .getAttribute('aria-label')
          .catch(() => null);
        if (reactionsEl) {
          const m = reactionsEl.replace(/,/g, '').match(/(\d+)/);
          if (m) engagement = parseInt(m[1], 10);
        }

        // Skip by filter — engagement threshold is skipped when count is unknown (0)
        const { kept } = applyFilter(
          [
            {
              postId,
              author,
              authorUrn: myUrn ?? '',
              url: '',
              hashtag: tag,
              engagement,
              alreadyLiked: false,
              text: body,
            },
          ],
          // When engagement is unknown, treat min_engagement as satisfied
          { ...config, min_engagement: engagement > 0 ? config.min_engagement : 0 },
          db,
          myUrn ?? undefined
        );

        if (kept.length === 0) continue;

        if (dryRun) {
          console.log(chalk.cyan(`  [dry-run] would like: ${author}`));
          quotaUsed++;
          continue;
        }

        // Click like
        await reactBtn.scrollIntoViewIfNeeded();
        await page.waitForTimeout(200 + Math.floor(Math.random() * 400));
        await reactBtn.click();
        await page.waitForTimeout(800 + Math.floor(Math.random() * 700));

        if (await isCaptchaPage(page)) {
          console.error(chalk.red('\nCaptcha detected — stopping immediately.'));
          await sendTelegramAlert('forge-linkedin: captcha detected, session paused. Check your account.');
          // break out of both inner item loop and outer tag loop
          quotaUsed = quota;
          break;
        }

        recordLike(db, {
          postId,
          author,
          authorUrn: '',
          url: '',
          hashtag: tag,
          engagement,
          alreadyLiked: false,
          text: body,
        });
        incrementToday(db);
        liked++;
        quotaUsed++;
        console.log(chalk.green(`  ✓ liked`), `${author} (${liked}/${quota})`);

        await limiter.randomDelay(config);

        if (await isCaptchaPage(page)) {
          console.error(chalk.red('\nCaptcha detected after like — stopping.'));
          await sendTelegramAlert('forge-linkedin: captcha detected, session paused.');
          break;
        }
      }

      await limiter.randomDelay(config);
    }

    if (dryRun) {
      console.log(chalk.cyan(`\n[dry-run] No clicks made. ${quotaUsed} would-like candidates.`));
    } else {
      console.log(`\nDone. ${liked} like${liked !== 1 ? 's' : ''} today.`);
      if (liked > 0) {
        await sendTelegramAlert(`forge-linkedin: ${liked} like${liked !== 1 ? 's' : ''} today.`);
      }
    }
  } finally {
    await ctx.close();
  }
}

export async function dryRun(): Promise<void> {
  return run({ dryRun: true });
}
