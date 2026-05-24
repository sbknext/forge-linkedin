import { join } from 'node:path';
import { homedir } from 'node:os';

export function forgeHome(): string {
  return join(homedir(), '.forge-linkedin');
}

export function forgePaths() {
  const home = forgeHome();
  return {
    home,
    env: join(home, '.env'),
    config: join(home, 'config.json'),
    db: join(home, 'data.db'),
    chromeProfile: join(home, 'chrome-profile'),
    logs: join(home, 'logs'),
  };
}
