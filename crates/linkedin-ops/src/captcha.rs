use thiserror::Error;

#[derive(Debug, Error)]
#[error("captcha/challenge detected — stopping all actions. Run `forge-linkedin status` and check for alerts.")]
pub struct CaptchaError;

/// Detect captcha / security challenge from page signals.
/// Call this after every navigation.
pub fn detect_captcha(url: &str, page_title: &str, html_snippet: &str) -> bool {
    let url_lc = url.to_lowercase();
    let title_lc = page_title.to_lowercase();
    let html_lc = html_snippet.to_lowercase();

    // URL-based signals
    if url_lc.contains("/checkpoint/challenge") {
        return true;
    }
    if url_lc.contains("/uas/login") && url_lc.contains("challenge") {
        return true;
    }
    if url_lc.contains("/checkpoint/rm/") {
        return true;
    }

    // Title-based signals
    if title_lc.contains("security verification") {
        return true;
    }
    if title_lc.contains("help us confirm") {
        return true;
    }
    if title_lc.contains("let's do a quick security check") {
        return true;
    }

    // HTML-based signals
    if html_lc.contains(r#"id="captcha-challenge""#) {
        return true;
    }
    if html_lc.contains("data-test-id=\"captcha\"") {
        return true;
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_page_no_captcha() {
        assert!(!detect_captcha(
            "https://www.linkedin.com/feed/",
            "LinkedIn",
            "<div class='feed'></div>"
        ));
    }

    #[test]
    fn test_checkpoint_url() {
        assert!(detect_captcha(
            "https://www.linkedin.com/checkpoint/challenge/abc123",
            "LinkedIn",
            ""
        ));
    }

    #[test]
    fn test_security_verification_title() {
        assert!(detect_captcha(
            "https://www.linkedin.com/feed/",
            "Security Verification — LinkedIn",
            ""
        ));
    }

    #[test]
    fn test_help_confirm_title() {
        assert!(detect_captcha(
            "https://www.linkedin.com/feed/",
            "Help us confirm you're human",
            ""
        ));
    }

    #[test]
    fn test_captcha_form_in_html() {
        assert!(detect_captcha(
            "https://www.linkedin.com/feed/",
            "LinkedIn",
            r#"<form id="captcha-challenge"><input type="text"></form>"#
        ));
    }

    #[test]
    fn test_case_insensitive() {
        assert!(detect_captcha(
            "https://www.linkedin.com/Checkpoint/Challenge/xyz",
            "SECURITY VERIFICATION",
            ""
        ));
    }
}
