use crate::captcha::{detect_captcha, CaptchaError};
use anyhow::{bail, Result};
use filter::PostCandidate;
use tracing::warn;

/// Handles the like interaction on LinkedIn posts
pub struct Engager {
    pub dry_run: bool,
}

impl Engager {
    pub fn new(dry_run: bool) -> Self {
        Self { dry_run }
    }

    /// Check current page for captcha signals. Returns Err if detected.
    pub fn guard_captcha(&self, url: &str, title: &str, html: &str) -> Result<()> {
        if detect_captcha(url, title, html) {
            warn!("captcha/challenge detected on page: {}", url);
            bail!(CaptchaError);
        }
        Ok(())
    }

    /// Log what we would do (used in dry-run mode)
    pub fn preview(&self, post: &PostCandidate) {
        println!(
            "  [dry-run] would like: {} by {} ({} engagements) [{}]",
            post.post_id, post.author, post.engagement_count, post.hashtag
        );
    }
}
