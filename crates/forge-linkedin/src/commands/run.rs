use anyhow::{bail, Context, Result};
use filter::{Filter, FilterConfig};
use linkedin_ops::{engage::Engager, search::Searcher, AppConfig};
use rate_limit::{validate_config, RateLimitConfig, RateLimiter, WindowStatus};
use std::path::Path;

fn load_config(forge_dir: &Path) -> Result<AppConfig> {
    let config_path = forge_dir.join("config.json");
    if !config_path.exists() {
        bail!("config.json not found. Run `forge-linkedin init` first.");
    }
    let raw = std::fs::read_to_string(&config_path)?;
    let cfg: AppConfig = serde_json::from_str(&raw)
        .context("failed to parse config.json")?;
    Ok(cfg)
}

pub async fn run(forge_dir: &Path, dry_run: bool) -> Result<()> {
    let db_path = forge_dir.join("data.db");
    if !db_path.exists() {
        bail!("Run `forge-linkedin init` first.");
    }
    let store = store::Store::open(&db_path)?;

    let app_cfg = load_config(forge_dir)?;

    // Build rate limiter
    let rl_cfg = RateLimitConfig {
        daily_cap: app_cfg.daily_cap,
        min_delay_sec: app_cfg.min_delay_sec,
        max_delay_sec: app_cfg.max_delay_sec,
        active_hours: app_cfg.active_hours,
        active_tz: app_cfg.active_tz.clone(),
        skip_weekends: app_cfg.skip_weekends,
    };
    validate_config(&rl_cfg)?;
    let rl = RateLimiter::new(rl_cfg);

    let today_count = store.today_count()? as u32;
    let window = rl.check_window(today_count);

    if window != WindowStatus::Active {
        if dry_run {
            println!("[dry-run] Window check: {}", window);
            println!("[dry-run] Continuing anyway in dry-run mode.");
        } else {
            println!("Outside active window: {}", window);
            println!("Exiting. No likes performed.");
            return Ok(());
        }
    }

    let remaining = rl.remaining(today_count);
    if remaining == 0 && !dry_run {
        println!("Daily cap reached ({}/{}). No likes performed.", today_count, app_cfg.daily_cap);
        return Ok(());
    }

    println!(
        "{} likes today / {} cap. Remaining: {}",
        today_count, app_cfg.daily_cap, remaining
    );

    let _filter = Filter::new(FilterConfig {
        min_engagement: app_cfg.min_engagement,
        skip_keywords: app_cfg.skip_keywords.clone(),
    });
    let _engager = Engager::new(dry_run);

    // NOTE: In production, this is where we:
    // 1. Launch Chrome with persistent profile
    // 2. Verify session (/feed)
    // 3. For each hashtag: navigate → scrape posts → extract candidates
    // 4. Filter + deduplicate → sort by engagement
    // 5. Like each (with random delay + captcha check)
    //
    // For compile-time correctness, we simulate the flow with mock candidates.

    println!();
    if dry_run {
        println!("[dry-run] Discovering posts for {} hashtags...", app_cfg.hashtags.len());
    } else {
        println!("Discovering posts for {} hashtags...", app_cfg.hashtags.len());
    }

    for hashtag in &app_cfg.hashtags {
        let url = Searcher::hashtag_url(hashtag);
        if dry_run {
            println!("  [dry-run] would navigate to: {}", url);
        } else {
            println!("  Searching: {}", url);
        }
    }

    println!();
    println!("Simulated: no real Chrome session active (run after `forge-linkedin login`).");
    if dry_run {
        println!("[dry-run] No likes performed.");
    }

    Ok(())
}
