use anyhow::{Context, Result};
use std::path::Path;

static ENV_EXAMPLE: &str = r#"# forge-linkedin secrets — copy to .env and fill in values
# chmod 600 ~/.forge-linkedin/.env
LINKEDIN_USERNAME=
LINKEDIN_PASSWORD=
# Optional: send alerts via Telegram when captcha is detected
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
"#;

pub async fn run(forge_dir: &Path) -> Result<()> {
    std::fs::create_dir_all(forge_dir)
        .with_context(|| format!("creating {}", forge_dir.display()))?;

    // chmod 700 on the dir
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(forge_dir)?.permissions();
        perms.set_mode(0o700);
        std::fs::set_permissions(forge_dir, perms)?;
    }

    // .env.example (NEVER prefill secrets)
    let env_example = forge_dir.join(".env.example");
    if !env_example.exists() {
        std::fs::write(&env_example, ENV_EXAMPLE)?;
    }

    // config.json
    let config_path = forge_dir.join("config.json");
    if !config_path.exists() {
        let default_cfg = linkedin_ops::AppConfig::default();
        let json = serde_json::to_string_pretty(&default_cfg)?;
        std::fs::write(&config_path, &json)?;
    }

    // data.db — open store to trigger migrations
    let db_path = forge_dir.join("data.db");
    let _store = store::Store::open(&db_path)?;

    // logs dir
    std::fs::create_dir_all(forge_dir.join("logs"))?;

    println!("Initialized ~/.forge-linkedin/");
    println!("  {} — fill in your LinkedIn credentials", forge_dir.join(".env.example").display());
    println!("  {} — edit hashtags + timing", forge_dir.join("config.json").display());
    println!();
    println!("Next:");
    println!("  1. cp ~/.forge-linkedin/.env.example ~/.forge-linkedin/.env");
    println!("  2. chmod 600 ~/.forge-linkedin/.env");
    println!("  3. edit ~/.forge-linkedin/.env");
    println!("  4. forge-linkedin login");

    Ok(())
}
