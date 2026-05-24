use anyhow::{bail, Result};
use std::path::Path;

pub async fn run(forge_dir: &Path) -> Result<()> {
    let config_path = forge_dir.join("config.json");
    if !config_path.exists() {
        bail!("config.json not found. Run `forge-linkedin init` first.");
    }
    let raw = std::fs::read_to_string(&config_path)?;
    // Re-parse and pretty-print (validates JSON + normalizes formatting)
    let cfg: serde_json::Value = serde_json::from_str(&raw)?;
    let pretty = serde_json::to_string_pretty(&cfg)?;
    println!("{}", pretty);
    Ok(())
}
