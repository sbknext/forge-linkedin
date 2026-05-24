import { loadConfig } from '../core/config.js';
import { getDb, todayCount, recentLikes, lastLogin } from '../core/db.js';
import chalk from 'chalk';

export async function status(): Promise<void> {
  const config = loadConfig();
  const db = getDb();

  const today = todayCount(db);
  const recent = recentLikes(db, 10);
  const lastLoginAt = lastLogin(db);

  console.log(chalk.bold('forge-linkedin v0.2.0'));
  console.log('─'.repeat(32));
  console.log(`Today's likes : ${chalk.bold(today)} / ${config.daily_cap}`);
  console.log(`Last login    : ${lastLoginAt ? chalk.green(lastLoginAt) : chalk.gray('never')}`);
  console.log(`Last run      : ${recent.length > 0 ? chalk.green(recent[0].liked_at) : chalk.gray('never')}`);

  if (recent.length > 0) {
    console.log('\nRecent likes:');
    recent.forEach((p, i) => {
      console.log(`  ${i + 1}. ${chalk.bold(p.author)} — ${p.hashtag} — ${chalk.gray(p.liked_at)}`);
    });
  } else {
    console.log('\nRecent likes: (none)');
  }
}
