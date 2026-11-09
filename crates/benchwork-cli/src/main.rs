//! CLI binary entrypoint for `benchwork`.

#![forbid(unsafe_code)]
#![warn(missing_debug_implementations)]

use clap::Parser;
use tracing_subscriber::EnvFilter;

use benchwork_cli::args::{Cli, Commands, UpArgs};
use benchwork_cli::handlers::{
    handle_archive_all, handle_capabilities, handle_mcp, handle_migrate, handle_snapshot,
    handle_tidy, handle_up,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Route logs strictly to stderr to prevent polluting stdout during --json or MCP modes
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .with_writer(std::io::stderr)
        .init();

    let cli = Cli::parse();
    let root = cli.root;

    // One span per invocation (`GB-339`). Every fallible step in this `main` is inside the async block below -
    // there are no `?` operators before the dispatch - so the span covers the whole run and its outcome.
    let command = std::env::args().nth(1).filter(|arg| !arg.starts_with('-'));
    let invocation = gaugeblock_workspace::InvocationSpan::start("benchwork", command.as_deref());

    let result = async {
        match cli.command {
            Some(Commands::Up(args)) => handle_up(root, args).await?,
            Some(Commands::Capabilities(args)) => handle_capabilities(root, args)?,
            Some(Commands::Snapshot(args)) => handle_snapshot(root, args)?,
            Some(Commands::Migrate(args)) => handle_migrate(root, args)?,
            Some(Commands::Tidy(args)) => handle_tidy(root, args)?,
            Some(Commands::ArchiveAll(args)) => handle_archive_all(root, args)?,
            Some(Commands::Mcp) => handle_mcp().await?,
            None => {
                // Default to running `benchwork up` with default parameters
                let default_up = UpArgs {
                    host: "127.0.0.1".to_string(),
                    port: 4242,
                    dev: false,
                    static_dir: None,
                };
                handle_up(root, default_up).await?;
            }
        }

        Ok(())
    }
    .await;

    invocation.finish(result.is_ok());
    result
}
