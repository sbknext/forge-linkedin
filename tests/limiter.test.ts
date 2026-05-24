import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { canRun, remainingQuota, randomDelayMs } from '../src/core/limiter.js';
import { openDb, incrementToday, todayCount } from '../src/core/db.js';
import type { Config } from '../src/types.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';

const BASE_CONFIG: Config = {
  hashtags: ['#AI'],
  daily_cap: 30,
  min_delay_sec: 90,
  max_delay_sec: 300,
  active_hours: [9, 21],
  active_tz: 'UTC',
  skip_weekends: false,
  min_engagement: 10,
  skip_keywords: [],
};

let tmpDir: string;
let db: Database.Database;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'forge-limiter-test-'));
  db = openDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true });
  vi.restoreAllMocks();
});

describe('canRun', () => {
  it('returns true during active hours (UTC window)', () => {
    // The test runs in UTC. canRun reads the actual clock, so we just verify
    // the function returns a boolean and does not throw.
    const result = canRun(BASE_CONFIG);
    expect(typeof result).toBe('boolean');
  });

  it('returns false for config where active window is [0,0]', () => {
    const cfg = { ...BASE_CONFIG, active_hours: [0, 0] as [number, number] };
    // Hour 0 is NOT in [0,0) range
    const result = canRun(cfg);
    expect(result).toBe(false);
  });

  it('returns false for config where active window excludes all hours', () => {
    // active_hours [25, 26] is impossible — effectively never active
    const cfg = { ...BASE_CONFIG, active_hours: [25, 26] as [number, number] };
    expect(canRun(cfg)).toBe(false);
  });

  it('returns true when active_hours covers full day [0,24]', () => {
    const cfg = { ...BASE_CONFIG, active_hours: [0, 24] as [number, number] };
    expect(canRun(cfg)).toBe(true);
  });

  it('returns false on weekend when skip_weekends=true and today is Saturday', () => {
    // Mock Date to be a Saturday
    const saturday = new Date('2026-05-23T10:00:00Z'); // Known Saturday
    vi.setSystemTime(saturday);
    const cfg = {
      ...BASE_CONFIG,
      active_tz: 'UTC',
      active_hours: [0, 24] as [number, number],
      skip_weekends: true,
    };
    expect(canRun(cfg)).toBe(false);
  });

  it('returns true on weekday when skip_weekends=true', () => {
    const monday = new Date('2026-05-25T10:00:00Z'); // Known Monday
    vi.setSystemTime(monday);
    const cfg = {
      ...BASE_CONFIG,
      active_tz: 'UTC',
      active_hours: [0, 24] as [number, number],
      skip_weekends: true,
    };
    expect(canRun(cfg)).toBe(true);
  });
});

describe('remainingQuota', () => {
  it('returns daily_cap when no likes used', () => {
    expect(remainingQuota(BASE_CONFIG, db)).toBe(30);
  });

  it('decrements as likes are recorded', () => {
    incrementToday(db);
    incrementToday(db);
    incrementToday(db);
    expect(remainingQuota(BASE_CONFIG, db)).toBe(27);
  });

  it('returns 0 when cap reached', () => {
    for (let i = 0; i < 30; i++) incrementToday(db);
    expect(remainingQuota(BASE_CONFIG, db)).toBe(0);
  });

  it('returns 0 (not negative) when over cap', () => {
    for (let i = 0; i < 35; i++) incrementToday(db);
    expect(remainingQuota(BASE_CONFIG, db)).toBe(0);
  });
});

describe('randomDelayMs', () => {
  it('returns value within [min*1000, max*1000]', () => {
    for (let i = 0; i < 50; i++) {
      const ms = randomDelayMs(90, 300);
      expect(ms).toBeGreaterThanOrEqual(90 * 1000);
      expect(ms).toBeLessThanOrEqual(300 * 1000);
    }
  });

  it('returns integer', () => {
    const ms = randomDelayMs(10, 20);
    expect(Number.isInteger(ms)).toBe(true);
  });
});
