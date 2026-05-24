use serde::{Deserialize, Serialize};
use tracing::debug;

/// Candidate post for liking, extracted from LinkedIn page
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PostCandidate {
    pub post_id: String,
    pub author: String,
    pub post_url: String,
    pub hashtag: String,
    pub engagement_count: u32,
    pub content_snippet: String,
    /// true if the viewer already liked this post
    pub already_liked: bool,
    /// true if the author is the logged-in user
    pub is_own_post: bool,
}

/// Config fields used by filter (subset of full config)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterConfig {
    pub min_engagement: u32,
    pub skip_keywords: Vec<String>,
}

impl Default for FilterConfig {
    fn default() -> Self {
        Self {
            min_engagement: 10,
            skip_keywords: vec![
                "hiring".into(),
                "recruiter".into(),
                "career opportunity".into(),
            ],
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum SkipReason {
    AlreadyLiked,
    OwnPost,
    LowEngagement(u32),
    KeywordMatch(String),
}

impl std::fmt::Display for SkipReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::AlreadyLiked => write!(f, "already_liked"),
            Self::OwnPost => write!(f, "own_post"),
            Self::LowEngagement(n) => write!(f, "low_engagement:{}", n),
            Self::KeywordMatch(kw) => write!(f, "keyword:{}", kw),
        }
    }
}

pub struct Filter {
    config: FilterConfig,
}

impl Filter {
    pub fn new(config: FilterConfig) -> Self {
        Self { config }
    }

    /// Returns `None` if the post passes all filters (i.e. is a good candidate).
    /// Returns `Some(reason)` if it should be skipped.
    pub fn should_skip(&self, post: &PostCandidate) -> Option<SkipReason> {
        if post.already_liked {
            debug!(post_id = %post.post_id, "skip: already liked");
            return Some(SkipReason::AlreadyLiked);
        }
        if post.is_own_post {
            debug!(post_id = %post.post_id, "skip: own post");
            return Some(SkipReason::OwnPost);
        }
        if post.engagement_count < self.config.min_engagement {
            debug!(post_id = %post.post_id, engagement = post.engagement_count, "skip: low engagement");
            return Some(SkipReason::LowEngagement(post.engagement_count));
        }
        let content_lower = post.content_snippet.to_lowercase();
        for kw in &self.config.skip_keywords {
            if content_lower.contains(&kw.to_lowercase()) {
                debug!(post_id = %post.post_id, keyword = %kw, "skip: keyword match");
                return Some(SkipReason::KeywordMatch(kw.clone()));
            }
        }
        None
    }

    /// Filter a batch, returning (accepted, skipped) pairs
    pub fn partition(
        &self,
        candidates: Vec<PostCandidate>,
    ) -> (Vec<PostCandidate>, Vec<(PostCandidate, SkipReason)>) {
        let mut accepted = Vec::new();
        let mut skipped = Vec::new();
        for post in candidates {
            match self.should_skip(&post) {
                None => accepted.push(post),
                Some(reason) => skipped.push((post, reason)),
            }
        }
        // sort accepted by engagement desc
        accepted.sort_by(|a, b| b.engagement_count.cmp(&a.engagement_count));
        (accepted, skipped)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_post(id: &str, engagement: u32, content: &str) -> PostCandidate {
        PostCandidate {
            post_id: id.into(),
            author: "Test User".into(),
            post_url: format!("https://linkedin.com/posts/{}", id),
            hashtag: "#AgenticAI".into(),
            engagement_count: engagement,
            content_snippet: content.into(),
            already_liked: false,
            is_own_post: false,
        }
    }

    #[test]
    fn test_pass_good_post() {
        let filter = Filter::new(FilterConfig::default());
        let post = make_post("p1", 50, "Great post about AI tooling");
        assert!(filter.should_skip(&post).is_none());
    }

    #[test]
    fn test_skip_already_liked() {
        let filter = Filter::new(FilterConfig::default());
        let mut post = make_post("p2", 50, "AI post");
        post.already_liked = true;
        assert_eq!(filter.should_skip(&post), Some(SkipReason::AlreadyLiked));
    }

    #[test]
    fn test_skip_own_post() {
        let filter = Filter::new(FilterConfig::default());
        let mut post = make_post("p3", 50, "My AI post");
        post.is_own_post = true;
        assert_eq!(filter.should_skip(&post), Some(SkipReason::OwnPost));
    }

    #[test]
    fn test_skip_low_engagement() {
        let filter = Filter::new(FilterConfig::default());
        let post = make_post("p4", 5, "AI post");
        assert_eq!(filter.should_skip(&post), Some(SkipReason::LowEngagement(5)));
    }

    #[test]
    fn test_skip_keyword_match() {
        let filter = Filter::new(FilterConfig::default());
        let post = make_post("p5", 100, "We are hiring senior engineers for AI roles");
        assert!(matches!(filter.should_skip(&post), Some(SkipReason::KeywordMatch(_))));
    }

    #[test]
    fn test_skip_keyword_case_insensitive() {
        let filter = Filter::new(FilterConfig::default());
        let post = make_post("p6", 100, "HIRING now for AI team");
        assert!(matches!(filter.should_skip(&post), Some(SkipReason::KeywordMatch(_))));
    }

    #[test]
    fn test_partition_sorts_by_engagement() {
        let filter = Filter::new(FilterConfig::default());
        let posts = vec![
            make_post("low", 20, "AI"),
            make_post("high", 200, "AI"),
            make_post("mid", 80, "AI"),
        ];
        let (accepted, skipped) = filter.partition(posts);
        assert_eq!(skipped.len(), 0);
        assert_eq!(accepted[0].post_id, "high");
        assert_eq!(accepted[1].post_id, "mid");
        assert_eq!(accepted[2].post_id, "low");
    }

    #[test]
    fn test_partition_mixed() {
        let filter = Filter::new(FilterConfig::default());
        let mut bad = make_post("bad", 5, "hiring");
        bad.already_liked = false; // low engagement first
        let posts = vec![
            make_post("good", 50, "AI insights"),
            bad,
        ];
        let (accepted, skipped) = filter.partition(posts);
        assert_eq!(accepted.len(), 1);
        assert_eq!(accepted[0].post_id, "good");
        assert_eq!(skipped.len(), 1);
    }

    #[test]
    fn test_skip_reason_display() {
        assert_eq!(SkipReason::AlreadyLiked.to_string(), "already_liked");
        assert_eq!(SkipReason::OwnPost.to_string(), "own_post");
        assert_eq!(SkipReason::LowEngagement(3).to_string(), "low_engagement:3");
        assert_eq!(SkipReason::KeywordMatch("hiring".into()).to_string(), "keyword:hiring");
    }
}
