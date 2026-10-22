//! Error types for `benchwork-core`.

use thiserror::Error;

/// Result alias for benchwork operations.
pub type Result<T> = std::result::Result<T, BenchworkError>;

/// Strongly-typed error enum for `benchwork-core`.
#[derive(Debug, Error)]
pub enum BenchworkError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Storypole domain error: {0}")]
    Storypole(String),

    #[error("Chalkline domain error: {0}")]
    Chalkline(String),

    #[error("Dado domain error: {0}")]
    Dado(String),

    #[error("Batten domain error: {0}")]
    Batten(String),

    #[error("Joiner domain error: {0}")]
    Joiner(String),

    #[error("Sawhorse domain error: {0}")]
    Sawhorse(String),

    #[error("Task not found: {0}")]
    TaskNotFound(String),

    #[error("Decision not found: {0}")]
    DecisionNotFound(String),

    #[error("Invalid request: {0}")]
    InvalidRequest(String),

    #[error("Workspace error: {0}")]
    Workspace(String),

    #[error("Relay error: {0}")]
    Relay(String),
}
