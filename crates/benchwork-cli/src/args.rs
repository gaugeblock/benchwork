//! CLI argument parsing definitions for `benchwork`.

use clap::{Args, Parser, Subcommand};
use std::path::PathBuf;

/// Modular visual workbench UI and local aggregator daemon.
#[derive(Debug, Parser)]
#[command(name = "benchwork", version, about, long_about = None)]
pub struct Cli {
    /// Workspace root directory.
    #[arg(short, long, global = true, default_value = ".")]
    pub root: PathBuf,

    #[command(subcommand)]
    pub command: Option<Commands>,
}

/// Available CLI subcommands.
#[derive(Debug, Subcommand)]
pub enum Commands {
    /// Launch the visual workbench server and static UI daemon.
    Up(UpArgs),
    /// Inspect detected workspace capabilities.
    Capabilities(FormatArgs),
    /// Capture a full snapshot of workspace state.
    Snapshot(FormatArgs),
    /// Migrate legacy dotfiles (.storypole, sawhorse.toml, .miter, etc.) to .gaugeblock/.
    Migrate(MigrateArgs),
    /// Launch stdio JSON-RPC 2.0 MCP server for agent integration.
    Mcp,
}

/// Arguments for `benchwork up`.
#[derive(Debug, Args)]
pub struct UpArgs {
    /// Bind address host.
    #[arg(long, default_value = "127.0.0.1")]
    pub host: String,

    /// Bind port.
    #[arg(short, long, default_value_t = 4242)]
    pub port: u16,

    /// Proxy frontend requests to Vite dev server on http://127.0.0.1:5173.
    #[arg(long, default_value_t = false)]
    pub dev: bool,

    /// Optional static assets directory override (defaults to embedded bundle).
    #[arg(long)]
    pub static_dir: Option<PathBuf>,
}

/// Arguments for formatted output subcommands.
#[derive(Debug, Args)]
pub struct FormatArgs {
    /// Format output as pretty JSON.
    #[arg(long, default_value_t = false)]
    pub json: bool,
}

/// Arguments for `benchwork migrate`.
#[derive(Debug, Args)]
pub struct MigrateArgs {
    /// Perform a dry run without modifying the filesystem.
    #[arg(long, default_value_t = false)]
    pub dry_run: bool,

    /// Force overwrite or backup of colliding destination paths.
    #[arg(long, default_value_t = false)]
    pub force: bool,

    /// Format output as pretty JSON.
    #[arg(long, default_value_t = false)]
    pub json: bool,
}
