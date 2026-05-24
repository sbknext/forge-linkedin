use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use directories::UserDirs;
use std::path::PathBuf;

mod commands;

#[derive(Parser)]
#[command(name = "forge-linkedin")]
#[command(about = "LinkedIn tag-search + auto-like via real Chrome session")]
#[command(version = "0.1.0")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create ~/.forge-linkedin/ with default config and empty database
    Init,
    /// Launch Chrome for manual (or credential-based) login; persists cookies
    Login,
    /// Discover posts → filter → like up to daily cap
    Run,
    /// Like today's count + recent log
    Status,
    /// Discover + filter posts but DO NOT click like
    DryRun,
    /// Print current config
    Config,
    /// Phase 2 job commands (not yet implemented)
    Jobs {
        #[command(subcommand)]
        action: JobCommands,
    },
}

#[derive(Subcommand)]
enum JobCommands {
    /// Search for jobs (Phase 2)
    Search,
    /// Apply to jobs (Phase 2)
    Apply,
}

fn forge_dir() -> Result<PathBuf> {
    let user_dirs = UserDirs::new().context("cannot determine home directory")?;
    Ok(user_dirs.home_dir().join(".forge-linkedin"))
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("forge_linkedin=info,warn")),
        )
        .init();

    // Load .env from forge dir if present (best effort)
    let forge_dir = forge_dir()?;
    let env_path = forge_dir.join(".env");
    if env_path.exists() {
        dotenvy::from_path(&env_path).ok();
    }

    let cli = Cli::parse();

    match cli.command {
        Commands::Init => commands::init::run(&forge_dir).await,
        Commands::Login => commands::login::run(&forge_dir).await,
        Commands::Run => commands::run::run(&forge_dir, false).await,
        Commands::DryRun => commands::run::run(&forge_dir, true).await,
        Commands::Status => commands::status::run(&forge_dir).await,
        Commands::Config => commands::config::run(&forge_dir).await,
        Commands::Jobs { action } => match action {
            JobCommands::Search | JobCommands::Apply => {
                println!("Coming soon (Phase 2). Track: https://github.com/sbknext/forge-linkedin/issues/1");
                Ok(())
            }
        },
    }
}
