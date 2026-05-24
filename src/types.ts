export interface Config {
  hashtags: string[];
  daily_cap: number;
  min_delay_sec: number;
  max_delay_sec: number;
  active_hours: [number, number];
  active_tz: string;
  skip_weekends: boolean;
  min_engagement: number;
  skip_keywords: string[];
}

export interface PostCandidate {
  postId: string;
  author: string;
  authorUrn?: string;
  url: string;
  hashtag: string;
  engagement: number;
  alreadyLiked: boolean;
  text?: string;
}

export interface LikeResult {
  success: boolean;
  alreadyLiked: boolean;
  captchaDetected: boolean;
  error?: string;
}

export interface DailyRecord {
  date: string;
  count: number;
}

export interface LikedPost {
  post_id: string;
  author: string;
  hashtag: string;
  url: string;
  liked_at: string;
}

export interface CaptchaError extends Error {
  name: 'CaptchaError';
}

export function isCaptchaError(e: unknown): e is CaptchaError {
  return e instanceof Error && e.name === 'CaptchaError';
}
