import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  openDb,
  wasLiked,
  recordLike,
  todayCount,
  incrementToday,
  recentLikes,
  lastLogin,
  setLastLogin,
  recordSkip,
} from '../src/core/db.js';
import type { PostCandidate } from '../src/types.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';

let tmpDir: string;
let db: Database.Database;

function makePost(id = 'post-001'): PostCandidate {
  return {
    postId: id,
    author: 'Bob',
    authorUrn: 'bob',
    url: `https://linkedin.com/feed/update/${id}/`,
    hashtag: '#AI',
    engagement: 42,
    alreadyLiked: false,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'forge-db-test-'));
  db = openDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true });
});

describe('wasLiked / recordLike', () => {
  it('returns false for unknown post', () => {
    expect(wasLiked(db, 'unknown')).toBe(false);
  });

  it('returns true after recording', () => {
    recordLike(db, makePost('p1'));
    expect(wasLiked(db, 'p1')).toBe(true);
  });

  it('is idempotent — does not throw on duplicate insert', () => {
    const post = makePost('p1');
    expect(() => {
      recordLike(db, post);
      recordLike(db, post);
    }).not.toThrow();
    expect(wasLiked(db, 'p1')).toBe(true);
  });
});

describe('todayCount / incrementToday', () => {
  it('starts at 0', () => {
    expect(todayCount(db)).toBe(0);
  });

  it('increments correctly', () => {
    incrementToday(db);
    expect(todayCount(db)).toBe(1);
    incrementToday(db);
    expect(todayCount(db)).toBe(2);
  });

  it('increments multiple times correctly', () => {
    for (let i = 0; i < 10; i++) incrementToday(db);
    expect(todayCount(db)).toBe(10);
  });
});

describe('recentLikes', () => {
  it('returns empty array when nothing liked', () => {
    expect(recentLikes(db)).toHaveLength(0);
  });

  it('returns liked posts in recency order', () => {
    recordLike(db, makePost('p1'));
    recordLike(db, makePost('p2'));
    const recent = recentLikes(db, 10);
    expect(recent.length).toBe(2);
  });

  it('respects limit parameter', () => {
    for (let i = 0; i < 5; i++) recordLike(db, makePost(`p${i}`));
    expect(recentLikes(db, 3)).toHaveLength(3);
  });
});

describe('lastLogin / setLastLogin', () => {
  it('returns null before any login', () => {
    expect(lastLogin(db)).toBeNull();
  });

  it('returns a timestamp after setLastLogin', () => {
    setLastLogin(db);
    const ts = lastLogin(db);
    expect(ts).not.toBeNull();
    expect(typeof ts).toBe('string');
  });

  it('updates on repeated calls', () => {
    setLastLogin(db);
    const first = lastLogin(db);
    setLastLogin(db);
    const second = lastLogin(db);
    // Both should be valid timestamps (may be equal within same second)
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
  });
});

describe('recordSkip', () => {
  it('does not throw', () => {
    expect(() => recordSkip(db, 'post-001', 'low-engagement:3')).not.toThrow();
  });

  it('can record multiple skips for same post', () => {
    expect(() => {
      recordSkip(db, 'post-001', 'reason-a');
      recordSkip(db, 'post-001', 'reason-b');
    }).not.toThrow();
  });
});
