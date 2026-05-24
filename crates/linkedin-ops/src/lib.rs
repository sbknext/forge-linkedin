pub mod auth;
pub mod captcha;
pub mod engage;
pub mod search;

pub use auth::LinkedInAuth;
pub use captcha::{detect_captcha, CaptchaError};
pub use engage::Engager;
pub use search::Searcher;

use serde::{Deserialize, Serialize};

/// Full app config, loaded from ~/.forge-linkedin/config.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub hashtags: Vec<String>,
    pub daily_cap: u32,
    pub min_delay_sec: u64,
    pub max_delay_sec: u64,
    pub active_hours: [u32; 2],
    pub active_tz: String,
    pub skip_weekends: bool,
    pub min_engagement: u32,
    pub skip_keywords: Vec<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            hashtags: vec![
                "#AgenticAI".into(),
                "#AIEngineering".into(),
                "#SelfImprovingAI".into(),
                "#LLM".into(),
                "#AITooling".into(),
            ],
            daily_cap: 30,
            min_delay_sec: 90,
            max_delay_sec: 300,
            active_hours: [9, 21],
            active_tz: "Asia/Kolkata".into(),
            skip_weekends: false,
            min_engagement: 10,
            skip_keywords: vec![
                "hiring".into(),
                "recruiter".into(),
                "career opportunity".into(),
            ],
        }
    }
}
