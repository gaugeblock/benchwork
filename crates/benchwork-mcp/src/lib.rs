//! `benchwork-mcp` — Model Context Protocol stdio server for benchwork.

#![forbid(unsafe_code)]
#![warn(missing_debug_implementations)]

pub mod server;
pub mod tools;

pub use server::{handle_message, run_stdio_server};
pub use tools::{dispatch_tool, list_tools};

/// Version of `benchwork-mcp`.
pub const VERSION: &str = env!("CARGO_PKG_VERSION");
