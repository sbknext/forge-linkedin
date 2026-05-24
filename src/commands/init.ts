import { mkdirSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { forgePaths } from '../core/paths.js';
import { defaultConfig } from '../core/config.js';
import chalk from 'chalk';

export async function init(): Promise<void> {
  const paths = forgePaths();

  // Create directories
  const dirs = [paths.home, paths.chromeProfile, paths.logs];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(chalk.green('  created'), dir);
    } else {
      console.log(chalk.gray('  exists '), dir);
    }
  }

  // Create .env if missing
  if (!existsSync(paths.env)) {
    const envContent = `# LinkedIn login (optional — leave blank to use manual browser login)
# NEVER commit this file with real credentials.
LINKEDIN_USERNAME=
LINKEDIN_PASSWORD=

# Telegram alerts (optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
`;
    writeFileSync(paths.env, envContent, { encoding: 'utf-8', mode: 0o600 });
    console.log(chalk.green('  created'), paths.env, chalk.gray('(mode 600)'));
  } else {
    console.log(chalk.gray('  exists '), paths.env);
  }

  // Always ensure .env is 600
  try {
    chmodSync(paths.env, 0o600);
  } catch { /* non-fatal */ }

  // Create config.json if missing
  if (!existsSync(paths.config)) {
    writeFileSync(paths.config, JSON.stringify(defaultConfig(), null, 2), 'utf-8');
    console.log(chalk.green('  created'), paths.config);
  } else {
    console.log(chalk.gray('  exists '), paths.config);
  }

  console.log('');
  console.log(chalk.bold('forge-linkedin initialised.'));
  console.log('');
  console.log('Next steps:');
  console.log(chalk.cyan('  1.'), `Edit ${paths.env} — add optional Telegram token`);
  console.log(chalk.cyan('  2.'), `Edit ${paths.config} — tune hashtags, delays, cap`);
  console.log(chalk.cyan('  3.'), 'forge-linkedin login');
  console.log(chalk.cyan('  4.'), 'forge-linkedin dry-run');
  console.log(chalk.cyan('  5.'), 'forge-linkedin run');
}
