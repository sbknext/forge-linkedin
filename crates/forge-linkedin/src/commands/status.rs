use anyhow::{bail, Result};
use std::path::Path;

pub async fn run(forge_dir: &Path) -> Result<()> {
    let db_path = forge_dir.join("data.db");
    if !db_path.exists() {
        bail!("No database found. Run `forge-linkedin init` first.");
    }
    let store = store::Store::open(&db_path)?;

    let config_path = forge_dir.join("config.json");
    let cap = if config_path.exists() {
        let raw = std::fs::read_to_string(&config_path)?;
        let cfg: linkedin_ops::AppConfig = serde_json::from_str(&raw).unwrap_or_default();
        cfg.daily_cap
    } else {
        30
    };

    let today_count = store.today_count()?;
    let skipped = store.today_skip_count()?;
    let last_login = store.last_login()?;
    let recent = store.recent_likes(5)?;

    println!("=== forge-linkedin status ===");
    println!("Today: {} / {} likes", today_count, cap);
    println!("Today skipped: {}", skipped);
    println!(
        "Last login: {}",
        last_login.as_deref().unwrap_or("never")
    );
    println!();
    if recent.is_empty() {
        println!("No likes recorded yet.");
    } else {
        println!("Last {} likes:", recent.len());
        for post in &recent {
            println!(
                "  {} | {} | {} | {}",
                post.liked_at.format("%Y-%m-%d %H:%M"),
                post.hashtag,
                post.author,
                post.post_id
            );
        }
    }

    Ok(())
}
