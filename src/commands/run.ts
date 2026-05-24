import { loadEnv } from '../core/env.js';
import { loadConfig } from '../core/config.js';
import { getDb, recordLike, incrementToday } from '../core/db.js';
import { applyFilter } from '../core/filter.js';
import * as limiter from '../core/limiter.js';
import { getBrowserContext, getOrCreatePage } from '../linkedin/browser.js';
import { isLoggedIn, getMyUrn } from '../linkedin/auth.js';
import { searchHashtag } from '../linkedin/search.js';
import { likePost, sendTelegramAlert } from '../linkedin/engage.js';
import type { PostCandidate } from '../types.js';
import chalk from 'chalk';
import ora from 'ora';

export async function run({ dryRun = false }: { dryRun?: boolean } = {}): Promise<void> {
  loadEnv();
  const config = loadConfig();
  const db = getDb();

  // Active hours check
  if (!limiter.canRun(config)) {
    console.log(chalk.yellow('Outside active window.'), `Active hours: ${config.active_hours[0]}:00–${config.active_hours[1]}:00 ${config.active_tz}`);
    return;
  }

  // Quota check
  const quota = limiter.remainingQuota(config, db);
  if (quota <= 0) {
    console.log(chalk.yellow('Daily cap reached.'), `${config.daily_cap}/${config.daily_cap} likes today.`);
    return;
  }

  console.log(dryRun ? chalk.cyan('[dry-run]') : '', `Quota: ${quota} remaining today`);

  // Launch browser
  const spinner = ora('Launching Chromium...').start();
  const ctx = await getBrowserContext();
  const page = await getOrCreatePage(ctx);
  spinner.succeed('Browser ready');

  try {
    // Auth check
    if (!(await isLoggedIn(page))) {
      console.error(chalk.red('Not logged in.'), 'Run `forge-linkedin login` first.');
      await ctx.close();
      process.exit(1);
    }

    // Get user URN for own-post filtering
    const myUrn = await getMyUrn(page);

    // Search all hashtags
    const allCandidates: PostCandidate[] = [];
    for (const tag of config.hashtags) {
      const tagSpinner = ora(`Searching ${tag}...`).start();
      try {
        const posts = await searchHashtag(page, tag);
        allCandidates.push(...posts);
        tagSpinner.succeed(`${tag}: ${posts.length} posts found`);
      } catch (e) {
        tagSpinner.fail(`${tag}: ${(e as Error).message}`);
      }
      await limiter.randomDelay(config);
    }

    // Filter
    const { kept, skipped } = applyFilter(allCandidates, config, db, myUrn ?? undefined);
    const toProcess = kept.slice(0, quota);

    console.log(`\n${kept.length} candidates after filter (${skipped.length} skipped), quota ${quota}`);

    if (dryRun) {
      console.log(chalk.cyan('\n[dry-run] Would like:'));
      toProcess.forEach((p, i) => {
        console.log(`  ${i + 1}. ${chalk.bold(p.author)} — ${p.engagement} reactions — ${p.url}`);
      });
      console.log(chalk.cyan(`\n[dry-run] No clicks made.`));
      await ctx.close();
      return;
    }

    // Like loop
    let liked = 0;
    for (const post of toProcess) {
      const result = await likePost(page, post.url);

      if (result.captchaDetected) {
        console.error(chalk.red('\nCaptcha detected — stopping immediately.'));
        await sendTelegramAlert('forge-linkedin: captcha detected, session paused. Check your account.');
        break;
      }

      if (result.alreadyLiked) {
        console.log(chalk.gray(`  skip (already liked): ${post.author}`));
        continue;
      }

      if (result.success) {
        recordLike(db, post);
        incrementToday(db);
        liked++;
        console.log(chalk.green(`  ✓ liked`), `${post.author} (${liked}/${quota})`);
      } else {
        console.log(chalk.yellow(`  ✗ failed`), `${post.url}: ${result.error ?? 'unknown'}`);
      }

      await limiter.randomDelay(config);
    }

    console.log(`\nDone. ${liked} like${liked !== 1 ? 's' : ''} today.`);

    if (liked > 0) {
      await sendTelegramAlert(`forge-linkedin: ${liked} like${liked !== 1 ? 's' : ''} today.`);
    }
  } finally {
    await ctx.close();
  }
}

export async function dryRun(): Promise<void> {
  return run({ dryRun: true });
}
