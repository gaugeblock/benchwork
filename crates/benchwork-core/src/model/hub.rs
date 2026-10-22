//! Capability, snapshot, and model hub models.

use joiner_core::AnonymizedSynthesisTrace;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

use super::dag::DagView;
use super::spec::{SpecBundle, SpecDocsStatus};

/// Workspace capability matrix returned by `/api/v1/capabilities`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WorkspaceCapabilities {
    /// Workspace root directory.
    pub root_path: String,
    /// Spec documentation status.
    pub spec_docs: SpecDocsStatus,
    /// Whether `.storypole` ledger is active.
    pub storypole_active: bool,
    /// Total tasks per status name.
    pub task_counts: BTreeMap<String, usize>,
    /// Number of decisions awaiting resolution.
    pub pending_decisions_count: usize,
    /// Number of registered `dado` AST patterns.
    pub dado_patterns_count: usize,
    /// Whether `sawhorse.toml` was found and valid.
    pub sawhorse_configured: bool,
    /// Number of pending telemetry traces in `.rabbet/spool/outbox.jsonl`.
    pub pending_telemetry_count: usize,
}

/// Complete UI snapshot returned by `/api/v1/snapshot`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UiSnapshot {
    /// Workspace capabilities.
    pub capabilities: WorkspaceCapabilities,
    /// DAG view of tasks.
    pub dag: DagView,
    /// Spec and decision bundle.
    pub spec_summary: SpecBundle,
    /// Count of pending spool traces.
    pub spool_traces_count: usize,
    /// Snapshot creation timestamp.
    pub timestamp_ms: u64,
}

/// Model hub status and active role configurations.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ModelHubStatus {
    /// Active role to configuration string map.
    pub roles: BTreeMap<String, String>,
    /// Pending synthesis traces in outbox.
    pub spool_traces: Vec<AnonymizedSynthesisTrace>,
    /// Spool traces grouped by tier.
    pub spool_counts_by_tier: BTreeMap<String, usize>,
}

/// Request to run a test inference ping.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InferencePingRequest {
    /// Target role (e.g. "planner", "hole_filler", "oracle").
    pub role: String,
    /// Prompt text.
    pub prompt: String,
}

/// Response from a test inference ping.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct InferencePingResponse {
    /// Role pinged.
    pub role: String,
    /// Generated output or echo.
    pub text: String,
    /// Latency in milliseconds.
    pub latency_ms: u64,
    /// Model used.
    pub model_used: String,
}
