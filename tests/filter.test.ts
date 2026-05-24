import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyFilter } from '../src/core/filter.js';
import { openDb, recordLike } from '../src/core/db.js';
import type { Config, PostCandidate } from '../src/types.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';

const BASE_CONFIG: Config = {
  hashtags: ['#AI'],
  daily_cap: 30,
  min_delay_sec: 1,
  max_delay_sec: 2,
  active_hours: [0, 24],
  active_tz: 'UTC',
  skip_weekends: false,
  min_engagement: 10,
  skip_keywords: ['hiring', 'recruiter'],
};

function makePost(overrides: Partial<PostCandidate> = {}): PostCandidate {
  return {
    postId: 'post-001',
    author: 'Alice',
    authorUrn: 'alice123',
    url: 'https://linkedin.com/feed/update/urn:li:activity:001/',
    hashtag: '#AI',
    engagement: 50,
    alreadyLiked: false,
    text: 'Great article about AI',
    ...overrides,
  };
}

let tmpDir: string;
let db: Database.Database;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'forge-test-'));
  db = openDb(join(tmpDir, 'test.db'));
});

afterEach(() => {
  db.close();
  rmSync(tmpDir, { recursive: true });
});

describe('applyFilter', () => {
  it('keeps a valid post', () => {
    const { kept } = applyFilter([makePost()], BASE_CONFIG, db);
    expect(kept).toHaveLength(1);
  });

  it('skips post with alreadyLiked=true', () => {
    const { kept, skipped } = applyFilter([makePost({ alreadyLiked: true })], BASE_CONFIG, db);
    expect(kept).toHaveLength(0);
    expect(skipped[0].reason).toBe('already-liked-ui');
  });

  it('skips post already in DB', () => {
    const post = makePost();
    recordLike(db, post);
    const { kept, skipped } = applyFilter([post], BASE_CONFIG, db);
    expect(kept).toHaveLength(0);
    expect(skipped[0].reason).toBe('already-liked-db');
  });

  it('skips own post when authorUrn matches', () => {
    const { kept, skipped } = applyFilter([makePost()], BASE_CONFIG, db, 'alice123');
    expect(kept).toHaveLength(0);
    expect(skipped[0].reason).toBe('own-post');
  });

  it('keeps post if myUrn does not match', () => {
    const { kept } = applyFilter([makePost()], BASE_CONFIG, db, 'bob456');
    expect(kept).toHaveLength(1);
  });

  it('skips post below min_engagement', () => {
    const { kept, skipped } = applyFilter([makePost({ engagement: 5 })], BASE_CONFIG, db);
    expect(kept).toHaveLength(0);
    expect(skipped[0].reason).toContain('low-engagement');
  });

  it('keeps post at exactly min_engagement', () => {
    const { kept } = applyFilter([makePost({ engagement: 10 })], BASE_CONFIG, db);
    expect(kept).toHaveLength(1);
  });

  it('skips post containing skip keyword (case insensitive)', () => {
    const { kept, skipped } = applyFilter(
      [makePost({ text: 'We are HIRING engineers' })],
      BASE_CONFIG,
      db
    );
    expect(kept).toHaveLength(0);
    expect(skipped[0].reason).toContain('keyword:hiring');
  });

  it('skips post containing recruiter keyword', () => {
    const { kept } = applyFilter(
      [makePost({ text: 'I am a Recruiter looking for talent' })],
      BASE_CONFIG,
      db
    );
    expect(kept).toHaveLength(0);
  });

  it('handles multiple posts, filters correctly', () => {
    const posts = [
      makePost({ postId: 'p1', engagement: 50, text: 'AI is great' }),
      makePost({ postId: 'p2', engagement: 3, text: 'low engagement' }),
      makePost({ postId: 'p3', engagement: 20, text: 'Hiring engineers now' }),
      makePost({ postId: 'p4', engagement: 100, text: 'Excellent content' }),
    ];
    const { kept, skipped } = applyFilter(posts, BASE_CONFIG, db);
    expect(kept).toHaveLength(2); // p1 and p4
    expect(skipped).toHaveLength(2);
  });

  it('returns empty arrays for empty input', () => {
    const { kept, skipped } = applyFilter([], BASE_CONFIG, db);
    expect(kept).toHaveLength(0);
    expect(skipped).toHaveLength(0);
  });
});
