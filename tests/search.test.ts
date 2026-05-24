import { describe, it, expect } from 'vitest';
import { buildHashtagUrl, derivePostId } from '../src/linkedin/search.js';

describe('buildHashtagUrl', () => {
  it('produces FACETED_SEARCH URL with encoded hashtag', () => {
    const url = buildHashtagUrl('AI');
    expect(url).toContain('search/results/content');
    expect(url).toContain(encodeURIComponent('#AI'));
    expect(url).toContain('FACETED_SEARCH');
    expect(url).toContain('date_posted');
  });

  it('strips leading # before encoding', () => {
    const withHash = buildHashtagUrl('#logistics');
    const withoutHash = buildHashtagUrl('logistics');
    expect(withHash).toBe(withoutHash);
  });

  it('does NOT contain the deprecated hashtag feed path', () => {
    const url = buildHashtagUrl('agentic-ai');
    expect(url).not.toContain('/feed/hashtag/');
  });
});

describe('derivePostId', () => {
  // Realistic innerText from a LinkedIn search result listitem
  const sampleText = [
    'Feed post',
    ' John Doe ',
    '  • 2nd',
    ' Senior Engineer at Acme ',
    ' 2h • ',
    ' Follow ',
    ' This is the actual post body about AI and automation. It contains multiple sentences.',
    ' 42 reactions',
    ' 7 comments',
    ' Like',
    ' Comment',
    ' Repost',
    ' Send',
  ].join('\n');

  it('returns a string', () => {
    expect(typeof derivePostId(sampleText)).toBe('string');
  });

  it('includes the author name', () => {
    const id = derivePostId(sampleText);
    expect(id).toContain('John Doe');
  });

  it('is deterministic — same input gives same output', () => {
    expect(derivePostId(sampleText)).toBe(derivePostId(sampleText));
  });

  it('is at most 200 chars', () => {
    const longBody = 'x'.repeat(500);
    const longText = `Feed post\nAlice\n2nd\nTitle\nTime\nFollow\n${longBody}`;
    expect(derivePostId(longText).length).toBeLessThanOrEqual(200);
  });

  it('produces different IDs for different authors', () => {
    const t1 = 'Feed post\nAlice\n2nd\nEngineer\n2h\nFollow\nSame body content here';
    const t2 = 'Feed post\nBob\n2nd\nEngineer\n2h\nFollow\nSame body content here';
    expect(derivePostId(t1)).not.toBe(derivePostId(t2));
  });

  it('produces different IDs for different post bodies', () => {
    const t1 = 'Feed post\nAlice\n2nd\nEngineer\n2h\nFollow\nPost about machine learning';
    const t2 = 'Feed post\nAlice\n2nd\nEngineer\n2h\nFollow\nPost about supply chain logistics';
    expect(derivePostId(t1)).not.toBe(derivePostId(t2));
  });

  it('handles empty / minimal input without throwing', () => {
    expect(() => derivePostId('')).not.toThrow();
    expect(() => derivePostId('Feed post')).not.toThrow();
  });
});
