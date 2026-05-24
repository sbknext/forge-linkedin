
/// Handles hashtag-based post discovery on LinkedIn
pub struct Searcher;

impl Searcher {
    pub fn new() -> Self {
        Self
    }

    /// Build the LinkedIn hashtag feed URL for a tag.
    /// Strips leading `#`, URL-encodes the rest.
    pub fn hashtag_url(tag: &str) -> String {
        let tag = tag.trim_start_matches('#');
        // URL-encode (only alphanumeric + safe chars in hashtags, but be safe)
        let encoded: String = tag
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c == '_' || c == '-' {
                    c.to_string()
                } else {
                    format!("%{:02X}", c as u32)
                }
            })
            .collect();
        format!("https://www.linkedin.com/feed/hashtag/{}/", encoded)
    }
}

impl Default for Searcher {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hashtag_url_strips_hash() {
        let url = Searcher::hashtag_url("#AgenticAI");
        assert_eq!(url, "https://www.linkedin.com/feed/hashtag/AgenticAI/");
    }

    #[test]
    fn test_hashtag_url_no_hash() {
        let url = Searcher::hashtag_url("LLM");
        assert_eq!(url, "https://www.linkedin.com/feed/hashtag/LLM/");
    }

    #[test]
    fn test_hashtag_url_with_numbers() {
        let url = Searcher::hashtag_url("#AIEngineering2024");
        assert!(url.contains("AIEngineering2024"));
    }
}
