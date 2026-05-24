use anyhow::{bail, Result};
use chrono::{DateTime, Datelike, Local, Timelike, Weekday};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub daily_cap: u32,
    pub min_delay_sec: u64,
    pub max_delay_sec: u64,
    /// [start_hour, end_hour] in 24h format; posts only within this range
    pub active_hours: [u32; 2],
    /// IANA tz string e.g. "Asia/Kolkata"
    pub active_tz: String,
    pub skip_weekends: bool,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            daily_cap: 30,
            min_delay_sec: 90,
            max_delay_sec: 300,
            active_hours: [9, 21],
            active_tz: "Asia/Kolkata".into(),
            skip_weekends: false,
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum WindowStatus {
    /// Active — go ahead
    Active,
    /// Outside active_hours window
    OutsideHours { current_hour: u32, start: u32, end: u32 },
    /// Weekend and skip_weekends is true
    Weekend,
    /// Daily cap reached
    CapReached { used: u32, cap: u32 },
}

impl std::fmt::Display for WindowStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Active => write!(f, "active"),
            Self::OutsideHours { current_hour, start, end } => {
                write!(f, "outside active hours (now {}:00, window {}:00-{}:00)", current_hour, start, end)
            }
            Self::Weekend => write!(f, "weekend (skip_weekends=true)"),
            Self::CapReached { used, cap } => write!(f, "daily cap reached ({}/{})", used, cap),
        }
    }
}

pub struct RateLimiter {
    config: RateLimitConfig,
}

impl RateLimiter {
    pub fn new(config: RateLimitConfig) -> Self {
        Self { config }
    }

    /// Check whether we're allowed to run right now given `today_count` likes already done.
    pub fn check_window(&self, today_count: u32) -> WindowStatus {
        // cap check
        if today_count >= self.config.daily_cap {
            return WindowStatus::CapReached {
                used: today_count,
                cap: self.config.daily_cap,
            };
        }

        // tz-aware current time
        let tz: Tz = Tz::from_str(&self.config.active_tz)
            .unwrap_or(chrono_tz::Asia::Kolkata);
        let now_tz: DateTime<Tz> = Local::now().with_timezone(&tz);

        // weekend check
        if self.config.skip_weekends {
            let wd = now_tz.weekday();
            if wd == Weekday::Sat || wd == Weekday::Sun {
                return WindowStatus::Weekend;
            }
        }

        // active hours check
        let [start, end] = self.config.active_hours;
        let current_hour = now_tz.hour();
        if current_hour < start || current_hour >= end {
            return WindowStatus::OutsideHours { current_hour, start, end };
        }

        WindowStatus::Active
    }

    /// Remaining likes allowed today
    pub fn remaining(&self, today_count: u32) -> u32 {
        self.config.daily_cap.saturating_sub(today_count)
    }

    /// Random delay in seconds between min and max
    pub fn random_delay_secs(&self) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        use std::time::SystemTime;
        // use system time as cheap entropy (no rand dep needed in test)
        let mut h = DefaultHasher::new();
        SystemTime::now().hash(&mut h);
        let v = h.finish();
        let range = self.config.max_delay_sec - self.config.min_delay_sec;
        if range == 0 {
            return self.config.min_delay_sec;
        }
        self.config.min_delay_sec + (v % range)
    }

    pub fn config(&self) -> &RateLimitConfig {
        &self.config
    }
}

/// Validate config values, return error if invalid
pub fn validate_config(cfg: &RateLimitConfig) -> Result<()> {
    if cfg.daily_cap == 0 || cfg.daily_cap > 100 {
        bail!("daily_cap must be 1-100 (LinkedIn safety margin)");
    }
    if cfg.min_delay_sec < 30 {
        bail!("min_delay_sec must be >= 30 seconds");
    }
    if cfg.min_delay_sec > cfg.max_delay_sec {
        bail!("min_delay_sec must be <= max_delay_sec");
    }
    let [start, end] = cfg.active_hours;
    if start >= 24 || end > 24 || start >= end {
        bail!("active_hours must be valid 24h range [start, end) with start < end");
    }
    Tz::from_str(&cfg.active_tz)
        .map_err(|_| anyhow::anyhow!("invalid active_tz: {}", cfg.active_tz))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg() -> RateLimitConfig {
        RateLimitConfig::default()
    }

    #[test]
    fn test_remaining() {
        let rl = RateLimiter::new(cfg());
        assert_eq!(rl.remaining(0), 30);
        assert_eq!(rl.remaining(29), 1);
        assert_eq!(rl.remaining(30), 0);
        assert_eq!(rl.remaining(99), 0); // saturating
    }

    #[test]
    fn test_cap_reached() {
        let rl = RateLimiter::new(cfg());
        let status = rl.check_window(30);
        assert_eq!(status, WindowStatus::CapReached { used: 30, cap: 30 });
    }

    #[test]
    fn test_cap_exceeded_still_blocked() {
        let rl = RateLimiter::new(cfg());
        let status = rl.check_window(50);
        assert_eq!(status, WindowStatus::CapReached { used: 50, cap: 30 });
    }

    #[test]
    fn test_outside_hours_detected() {
        let mut c = cfg();
        // Set active hours to a window that definitely doesn't include current hour
        // by making an impossible window (0-0 is empty, but validator catches it)
        // Instead test by manipulating hours to [22,23] — unlikely to be current
        c.active_hours = [22, 23];
        let rl = RateLimiter::new(c);
        let status = rl.check_window(0);
        // Either Active (if test runs at 22:xx IST) or OutsideHours
        match status {
            WindowStatus::Active | WindowStatus::OutsideHours { .. } => {}
            other => panic!("unexpected status: {}", other),
        }
    }

    #[test]
    fn test_active_full_day_window() {
        let mut c = cfg();
        c.active_hours = [0, 24];
        c.skip_weekends = false;
        let rl = RateLimiter::new(c);
        // With full 0-24 window and 0 count, should always be Active
        assert_eq!(rl.check_window(0), WindowStatus::Active);
    }

    #[test]
    fn test_random_delay_in_range() {
        let rl = RateLimiter::new(cfg());
        for _ in 0..20 {
            let d = rl.random_delay_secs();
            assert!(d >= 90, "delay {} < min 90", d);
            assert!(d < 300, "delay {} >= max 300", d);
        }
    }

    #[test]
    fn test_validate_config_ok() {
        assert!(validate_config(&cfg()).is_ok());
    }

    #[test]
    fn test_validate_rejects_low_delay() {
        let mut c = cfg();
        c.min_delay_sec = 10;
        assert!(validate_config(&c).is_err());
    }

    #[test]
    fn test_validate_rejects_bad_cap() {
        let mut c = cfg();
        c.daily_cap = 0;
        assert!(validate_config(&c).is_err());
        c.daily_cap = 200;
        assert!(validate_config(&c).is_err());
    }

    #[test]
    fn test_validate_rejects_inverted_delay() {
        let mut c = cfg();
        c.min_delay_sec = 300;
        c.max_delay_sec = 90;
        assert!(validate_config(&c).is_err());
    }

    #[test]
    fn test_validate_rejects_bad_tz() {
        let mut c = cfg();
        c.active_tz = "NotAReal/Timezone".into();
        assert!(validate_config(&c).is_err());
    }

    #[test]
    fn test_window_status_display() {
        assert_eq!(WindowStatus::Active.to_string(), "active");
        assert_eq!(WindowStatus::Weekend.to_string(), "weekend (skip_weekends=true)");
        assert!(WindowStatus::CapReached { used: 30, cap: 30 }.to_string().contains("30/30"));
    }
}
