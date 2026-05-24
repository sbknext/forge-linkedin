use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use directories::UserDirs;
use std::path::PathBuf;

mod commands;

#[derive(Parser)]
#[command(name = "forge-linkedin")]
#[command(about = "LinkedIn tag-search + auto-like via real Chrome session")]
#[command(version = "0.1.1")]
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
    /// Phase 2 company tracking commands (coming soon)
    Company {
        #[command(subcommand)]
        action: CompanyCommands,
    },
    /// Phase 2 network growth commands (coming soon)
    Network {
        #[command(subcommand)]
        action: NetworkCommands,
    },
}

#[derive(Subcommand)]
enum CompanyCommands {
    /// Search for companies by keyword (Phase 2)
    Search {
        /// Keyword to search for
        keyword: Option<String>,
    },
    /// Follow a company page by name or LinkedIn URL (Phase 2)
    Follow {
        /// Company name or LinkedIn URL
        target: Option<String>,
    },
}

#[derive(Subcommand)]
enum NetworkCommands {
    /// Find 2nd-degree connections matching your hashtag profile; send up to 5 notes/day (Phase 2)
    Grow,
    /// Daily digest of new posts from your network, ranked by signal (Phase 2)
    Digest,
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
        Commands::Company { action } => match action {
            CompanyCommands::Search { .. } | CompanyCommands::Follow { .. } => {
                println!(
                    "Coming in Phase 2 — track: https://github.com/sbknext/forge-linkedin/issues/2"
                );
                Ok(())
            }
        },
        Commands::Network { action } => match action {
            NetworkCommands::Grow => {
                println!("Find 2nd-degree connections matching your hashtag profile, send 5 thoughtful connection notes/day. Coming Phase 2.");
                println!("Track: https://github.com/sbknext/forge-linkedin/issues/2");
                Ok(())
            }
            NetworkCommands::Digest => {
                println!("Daily digest of new posts from your network, ranked by signal. Coming Phase 2.");
                println!("Track: https://github.com/sbknext/forge-linkedin/issues/2");
                Ok(())
            }
        },
    }
}
