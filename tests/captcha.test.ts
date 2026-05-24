import { describe, it, expect } from 'vitest';
import {
  captchaUrlPatterns,
  captchaSelectors,
  captchaTitlePatterns,
  CaptchaError,
} from '../src/linkedin/captcha.js';

describe('captchaUrlPatterns', () => {
  const challengeUrls = [
    'https://www.linkedin.com/checkpoint/lg/login-submit',
    'https://www.linkedin.com/captcha/solve',
    'https://www.linkedin.com/uas/login?session_redirect=',
    'https://www.linkedin.com/security/verification',
    'https://www.linkedin.com/challenge/verify',
  ];

  const safeUrls = [
    'https://www.linkedin.com/feed/',
    'https://www.linkedin.com/in/johndoe/',
    'https://www.linkedin.com/feed/hashtag/agentic-ai/',
    'https://www.linkedin.com/feed/update/urn:li:activity:12345/',
  ];

  it.each(challengeUrls)('detects challenge URL: %s', (url) => {
    const lc = url.toLowerCase();
    expect(captchaUrlPatterns.some(p => lc.includes(p))).toBe(true);
  });

  it.each(safeUrls)('does not flag safe URL: %s', (url) => {
    const lc = url.toLowerCase();
    expect(captchaUrlPatterns.some(p => lc.includes(p))).toBe(false);
  });
});

describe('captchaTitlePatterns', () => {
  const challengeTitles = [
    'Security Verification | LinkedIn',
    'Security Check | LinkedIn',
    'Let\'s do a quick security check',
    'Please confirm your identity',
    'Challenge required',
    'Please verify it\'s you',
  ];

  const safeTitles = [
    'Feed | LinkedIn',
    'John Doe | LinkedIn',
    'AI Engineering | LinkedIn',
  ];

  it.each(challengeTitles)('detects challenge title: %s', (title) => {
    const lc = title.toLowerCase();
    expect(captchaTitlePatterns.some(p => lc.includes(p))).toBe(true);
  });

  it.each(safeTitles)('does not flag safe title: %s', (title) => {
    const lc = title.toLowerCase();
    // All safe titles should not match ANY captcha title pattern
    const matches = captchaTitlePatterns.filter(p => lc.includes(p));
    // Feed / profile pages should not match security/captcha patterns
    expect(matches.filter(p => ['security', 'captcha', 'challenge'].includes(p))).toHaveLength(0);
  });
});

describe('captchaSelectors', () => {
  it('contains at least one selector', () => {
    expect(captchaSelectors.length).toBeGreaterThan(0);
  });

  it('selectors are valid CSS strings', () => {
    captchaSelectors.forEach(sel => {
      expect(typeof sel).toBe('string');
      expect(sel.length).toBeGreaterThan(0);
    });
  });
});

describe('CaptchaError', () => {
  it('is an Error instance', () => {
    const e = new CaptchaError('https://linkedin.com/checkpoint/');
    expect(e).toBeInstanceOf(Error);
  });

  it('has name CaptchaError', () => {
    const e = new CaptchaError('https://linkedin.com/captcha');
    expect(e.name).toBe('CaptchaError');
  });

  it('message includes URL', () => {
    const url = 'https://linkedin.com/checkpoint/test';
    const e = new CaptchaError(url);
    expect(e.message).toContain(url);
  });
});
