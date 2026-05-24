import { loadConfig } from '../core/config.js';
import { forgePaths } from '../core/paths.js';
import chalk from 'chalk';

const FIELD_DESCRIPTIONS: Record<string, string> = {
  hashtags: 'Hashtags to search (rotated each run)',
  daily_cap: 'Maximum likes per calendar day (hard ceiling: 30)',
  min_delay_sec: 'Minimum wait between actions (seconds)',
  max_delay_sec: 'Maximum wait between actions (seconds)',
  active_hours: 'Active window [start_hour, end_hour] in 24h format',
  active_tz: 'Timezone for active_hours evaluation',
  skip_weekends: 'Skip runs on Saturday and Sunday',
  min_engagement: 'Skip posts with fewer reactions than this',
  skip_keywords: 'Skip posts whose text contains any of these keywords',
};

export async function printConfig(): Promise<void> {
  const config = loadConfig();
  const { config: configPath } = forgePaths();

  console.log(chalk.bold('forge-linkedin config'));
  console.log(chalk.gray(configPath));
  console.log('─'.repeat(48));

  for (const [key, value] of Object.entries(config)) {
    const desc = FIELD_DESCRIPTIONS[key] ?? '';
    const displayValue = Array.isArray(value)
      ? JSON.stringify(value)
      : String(value);
    console.log(`  ${chalk.cyan(key.padEnd(20))} ${chalk.bold(displayValue)}`);
    if (desc) console.log(`  ${''.padEnd(20)} ${chalk.gray(desc)}`);
  }
}
