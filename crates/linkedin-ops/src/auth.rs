use anyhow::Result;
use std::path::PathBuf;

/// Credentials loaded from environment / .env file.
/// Password is never stored in memory longer than needed.
pub struct Credentials {
    pub username: String,
    // stored as option — may be absent if manual login
    password: Option<String>,
}

impl Credentials {
    pub fn from_env() -> Option<Self> {
        let username = std::env::var("LINKEDIN_USERNAME").ok()?;
        let password = std::env::var("LINKEDIN_PASSWORD").ok();
        Some(Self { username, password })
    }

    pub fn has_password(&self) -> bool {
        self.password.is_some()
    }

    /// Consume and return password exactly once; cleared from self
    pub fn take_password(&mut self) -> Option<String> {
        self.password.take()
    }
}

// Drop zeros out password memory
impl Drop for Credentials {
    fn drop(&mut self) {
        if let Some(ref mut pw) = self.password {
            // overwrite in place before drop
            let bytes = unsafe { pw.as_bytes_mut() };
            for b in bytes.iter_mut() {
                *b = 0;
            }
        }
    }
}

pub struct LinkedInAuth {
    chrome_profile_dir: PathBuf,
}

impl LinkedInAuth {
    pub fn new(chrome_profile_dir: PathBuf) -> Self {
        Self { chrome_profile_dir }
    }

    pub fn chrome_profile_dir(&self) -> &PathBuf {
        &self.chrome_profile_dir
    }

    /// Validate that the chrome profile directory is ready
    pub fn ensure_profile_dir(&self) -> Result<()> {
        std::fs::create_dir_all(&self.chrome_profile_dir)?;
        Ok(())
    }

    /// Check if a cookies file exists in the profile — rough proxy for "has logged in before"
    pub fn has_saved_session(&self) -> bool {
        // Chrome stores cookies in Default/Cookies or Default/Network/Cookies
        let cookies_path = self.chrome_profile_dir.join("Default").join("Cookies");
        let cookies_path2 = self.chrome_profile_dir.join("Default").join("Network").join("Cookies");
        cookies_path.exists() || cookies_path2.exists()
    }

    /// Build the chromium launch args for persistent profile
    pub fn chrome_launch_args(&self) -> Vec<String> {
        vec![
            format!("--user-data-dir={}", self.chrome_profile_dir.display()),
            "--disable-blink-features=AutomationControlled".into(),
            "--no-first-run".into(),
            "--no-default-browser-check".into(),
        ]
    }
}
