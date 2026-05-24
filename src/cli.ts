#!/usr/bin/env node
import { Command } from 'commander';
import { init } from './commands/init.js';
import { login } from './commands/login.js';
import { run, dryRun } from './commands/run.js';
import { status } from './commands/status.js';
import { printConfig } from './commands/config.js';
import { companySearch, companyFollow } from './commands/company.js';
import { networkGrow, networkDigest } from './commands/network.js';

const program = new Command();

program
  .name('forge-linkedin')
  .description('Safe-pace LinkedIn engagement for solo devs. 30 likes/day max.')
  .version('0.2.0');

program
  .command('init')
  .description('Scaffold ~/.forge-linkedin/ with default config and empty .env')
  .action(() => init().catch(die));

program
  .command('login')
  .description('Open Chromium, log in to LinkedIn (manual or .env), persist session')
  .action(() => login().catch(die));

program
  .command('run')
  .description('Discover → filter → like (respects daily cap, active hours)')
  .action(() => run().catch(die));

program
  .command('dry-run')
  .description('Same as run, but print candidates without clicking anything')
  .action(() => dryRun().catch(die));

program
  .command('status')
  .description("Today's like count, recent 10 liked posts, last login timestamp")
  .action(() => status().catch(die));

program
  .command('config')
  .description('Pretty-print current ~/.forge-linkedin/config.json')
  .action(() => printConfig().catch(die));

// Phase 2 — company
const company = program.command('company').description('Company tracking (Phase 2)');
company
  .command('search <query>')
  .description('Search for companies [stub]')
  .action((q: string) => companySearch(q).catch(die));
company
  .command('follow <url>')
  .description('Follow a company [stub]')
  .action((url: string) => companyFollow(url).catch(die));

// Phase 2 — network
const network = program.command('network').description('Network growth (Phase 2)');
network
  .command('grow')
  .description('Connect with 2nd-degree matches [stub]')
  .action(() => networkGrow().catch(die));
network
  .command('digest')
  .description('Signal-ranked network digest [stub]')
  .action(() => networkDigest().catch(die));

program.parse();

function die(e: Error): never {
  console.error('Error:', e.message);
  process.exit(1);
}
