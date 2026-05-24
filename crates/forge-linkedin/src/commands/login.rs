use anyhow::{bail, Result};
use chrono::Local;
use linkedin_ops::{auth::Credentials, auth::LinkedInAuth};
use std::path::Path;

pub async fn run(forge_dir: &Path) -> Result<()> {
    let db_path = forge_dir.join("data.db");
    if !db_path.exists() {
        bail!("Run `forge-linkedin init` first.");
    }
    let store = store::Store::open(&db_path)?;

    let chrome_profile = forge_dir.join("chrome-profile");
    let auth = LinkedInAuth::new(chrome_profile);
    auth.ensure_profile_dir()?;

    let creds = Credentials::from_env();
    let has_creds = creds.as_ref().map(|c| c.has_password()).unwrap_or(false);

    if has_creds {
        println!("Credentials found in .env. Launching Chrome for automated login...");
    } else {
        println!("No credentials in .env. Launching Chrome for manual login...");
    }

    // NOTE: actual chromiumoxide browser launch happens here in a real impl.
    // The browser opens linkedin.com/login with the persistent profile.
    // If creds present: fill username/password fields (values never logged).
    // If no creds: user logs in manually and presses Enter.
    //
    // This stub simulates the flow for compile + test purposes.
    // Full impl requires a running Chrome/Chromium binary.

    println!("Simulated: would launch Chrome with --user-data-dir={}", auth.chrome_profile_dir().display());
    println!("Simulated: would navigate to https://www.linkedin.com/login");

    if has_creds {
        println!("Simulated: would fill credentials (not logged) and submit");
    } else {
        println!("Please log in manually in Chrome. Press Enter when done.");
        // In production: wait for stdin
        // let mut buf = String::new();
        // std::io::stdin().read_line(&mut buf)?;
    }

    println!("Simulated: would verify session on /feed");
    println!("Simulated: would persist cookies via Chrome user data dir");

    let now = Local::now().format("%Y-%m-%dT%H:%M:%S").to_string();
    store.set_last_login(&now)?;
    println!("Session timestamp saved: {}", now);
    println!("Login complete. Run `forge-linkedin run` to start liking.");

    Ok(())
}
