import { loadEnv } from '../core/env.js';
import { getBrowserContext, getOrCreatePage } from '../linkedin/browser.js';
import { loginInteractive, isLoggedIn } from '../linkedin/auth.js';
import { getDb, setLastLogin } from '../core/db.js';
import chalk from 'chalk';

export async function login(): Promise<void> {
  loadEnv();
  const db = getDb();

  console.log('Launching Chromium (persistent session)...');
  const ctx = await getBrowserContext();
  const page = await getOrCreatePage(ctx);

  try {
    // Check if already logged in
    const already = await isLoggedIn(page);
    if (already) {
      console.log(chalk.green('Already logged in.'), 'Session is active.');
      setLastLogin(db);
      await ctx.close();
      return;
    }

    await loginInteractive(page);
    setLastLogin(db);
    console.log(chalk.green('Login complete.'), 'Session saved to ~/.forge-linkedin/chrome-profile/');
  } catch (e) {
    console.error(chalk.red('Login failed:'), (e as Error).message);
    await ctx.close();
    process.exit(1);
  }

  await ctx.close();
}
