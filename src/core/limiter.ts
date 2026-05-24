import type Database from 'better-sqlite3';
import type { Config } from '../types.js';
import { todayCount } from './db.js';

export function canRun(config: Config): boolean {
  const now = getCurrentHourInTz(config.active_tz);
  const [start, end] = config.active_hours;

  if (now < start || now >= end) return false;

  if (config.skip_weekends) {
    const day = getDayOfWeekInTz(config.active_tz);
    if (day === 0 || day === 6) return false; // Sunday=0, Saturday=6
  }

  return true;
}

export function remainingQuota(config: Config, db: Database.Database): number {
  const used = todayCount(db);
  return Math.max(0, config.daily_cap - used);
}

export async function randomDelay(config: Config): Promise<void> {
  const { min_delay_sec, max_delay_sec } = config;
  const ms = Math.floor(
    (Math.random() * (max_delay_sec - min_delay_sec) + min_delay_sec) * 1000
  );
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function randomDelayMs(minSec: number, maxSec: number): number {
  return Math.floor((Math.random() * (maxSec - minSec) + minSec) * 1000);
}

function getCurrentHourInTz(tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    const hourPart = parts.find(p => p.type === 'hour');
    return hourPart ? parseInt(hourPart.value, 10) : new Date().getHours();
  } catch {
    return new Date().getHours();
  }
}

function getDayOfWeekInTz(tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
    }).formatToParts(new Date());
    const weekdayPart = parts.find(p => p.type === 'weekday');
    if (!weekdayPart) return new Date().getDay();
    const days: Record<string, number> = {
      Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
    };
    return days[weekdayPart.value] ?? new Date().getDay();
  } catch {
    return new Date().getDay();
  }
}
