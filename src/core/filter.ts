import type Database from 'better-sqlite3';
import type { Config, PostCandidate } from '../types.js';
import { wasLiked } from './db.js';

export interface FilterResult {
  kept: PostCandidate[];
  skipped: Array<{ post: PostCandidate; reason: string }>;
}

export function applyFilter(
  candidates: PostCandidate[],
  config: Config,
  db: Database.Database,
  myAuthorUrn?: string
): FilterResult {
  const kept: PostCandidate[] = [];
  const skipped: Array<{ post: PostCandidate; reason: string }> = [];

  for (const post of candidates) {
    const reason = checkPost(post, config, db, myAuthorUrn);
    if (reason) {
      skipped.push({ post, reason });
    } else {
      kept.push(post);
    }
  }

  return { kept, skipped };
}

function checkPost(
  post: PostCandidate,
  config: Config,
  db: Database.Database,
  myAuthorUrn?: string
): string | null {
  // Already liked in this session or previously
  if (post.alreadyLiked) return 'already-liked-ui';

  // Check DB
  if (wasLiked(db, post.postId)) return 'already-liked-db';

  // Own post
  if (myAuthorUrn && post.authorUrn && post.authorUrn === myAuthorUrn) {
    return 'own-post';
  }

  // Engagement threshold
  if (post.engagement < config.min_engagement) {
    return `low-engagement:${post.engagement}`;
  }

  // Skip keywords
  const text = (post.text ?? '').toLowerCase();
  for (const kw of config.skip_keywords) {
    if (text.includes(kw.toLowerCase())) {
      return `keyword:${kw}`;
    }
  }

  return null;
}
