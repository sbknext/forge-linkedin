import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { forgePaths } from './paths.js';
import type { Config } from '../types.js';

const DEFAULT_CONFIG: Config = {
  hashtags: ['#AgenticAI', '#AIEngineering', '#SelfImprovingAI', '#LLM', '#AITooling'],
  daily_cap: 30,
  min_delay_sec: 90,
  max_delay_sec: 300,
  active_hours: [9, 21],
  active_tz: 'Asia/Kolkata',
  skip_weekends: false,
  min_engagement: 10,
  skip_keywords: ['hiring', 'recruiter', 'career opportunity'],
};

export function loadConfig(overridePath?: string): Config {
  const configPath = overridePath ?? forgePaths().config;

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<Config>;
    const merged: Config = { ...DEFAULT_CONFIG, ...parsed };

    // Enforce hard ceiling — daily_cap cannot exceed 30
    if (merged.daily_cap > 30) {
      merged.daily_cap = 30;
    }

    return merged;
  } catch (e) {
    throw new Error(`Failed to parse config at ${configPath}: ${(e as Error).message}`);
  }
}

export function saveConfig(config: Config, overridePath?: string): void {
  const configPath = overridePath ?? forgePaths().config;
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function defaultConfig(): Config {
  return { ...DEFAULT_CONFIG };
}
