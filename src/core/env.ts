import { config } from 'dotenv';
import { forgePaths } from './paths.js';

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  const { env } = forgePaths();
  config({ path: env });
  loaded = true;
}

export function getEnv(key: string): string | undefined {
  loadEnv();
  return process.env[key];
}

export function maskSecret(val: string): string {
  if (val.length <= 8) return '****';
  return val.slice(0, 4) + '****' + val.slice(-4);
}
