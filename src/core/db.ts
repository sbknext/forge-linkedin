import Database from 'better-sqlite3';
import { forgePaths } from './paths.js';
import type { LikedPost, PostCandidate } from '../types.js';

let _db: Database.Database | null = null;

export function getDb(overridePath?: string): Database.Database {
  if (_db) return _db;
  const dbPath = overridePath ?? forgePaths().db;
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  migrate(_db);
  return _db;
}

// For tests — allows fresh DB per test
export function openDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  migrate(db);
  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS liked_posts (
      post_id   TEXT PRIMARY KEY,
      author    TEXT NOT NULL DEFAULT '',
      hashtag   TEXT NOT NULL DEFAULT '',
      url       TEXT NOT NULL DEFAULT '',
      liked_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_count (
      date  TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS skipped_posts (
      post_id TEXT NOT NULL,
      reason  TEXT NOT NULL,
      ts      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      last_login_at TEXT
    );

    INSERT OR IGNORE INTO sessions (id, last_login_at) VALUES (1, NULL);
  `);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function wasLiked(db: Database.Database, postId: string): boolean {
  const row = db.prepare('SELECT 1 FROM liked_posts WHERE post_id = ?').get(postId);
  return !!row;
}

export function recordLike(db: Database.Database, post: PostCandidate): void {
  db.prepare(`
    INSERT OR IGNORE INTO liked_posts (post_id, author, hashtag, url, liked_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(post.postId, post.author, post.hashtag, post.url);
}

export function todayCount(db: Database.Database): number {
  const row = db.prepare('SELECT count FROM daily_count WHERE date = ?').get(todayISO()) as
    | { count: number }
    | undefined;
  return row?.count ?? 0;
}

export function incrementToday(db: Database.Database): void {
  const today = todayISO();
  db.prepare(`
    INSERT INTO daily_count (date, count) VALUES (?, 1)
    ON CONFLICT(date) DO UPDATE SET count = count + 1
  `).run(today);
}

export function recentLikes(db: Database.Database, limit = 10): LikedPost[] {
  return db
    .prepare('SELECT * FROM liked_posts ORDER BY liked_at DESC LIMIT ?')
    .all(limit) as LikedPost[];
}

export function lastLogin(db: Database.Database): string | null {
  const row = db.prepare('SELECT last_login_at FROM sessions WHERE id = 1').get() as
    | { last_login_at: string | null }
    | undefined;
  return row?.last_login_at ?? null;
}

export function setLastLogin(db: Database.Database): void {
  db.prepare("UPDATE sessions SET last_login_at = datetime('now') WHERE id = 1").run();
}

export function recordSkip(db: Database.Database, postId: string, reason: string): void {
  db.prepare(`
    INSERT INTO skipped_posts (post_id, reason, ts)
    VALUES (?, ?, datetime('now'))
  `).run(postId, reason);
}
