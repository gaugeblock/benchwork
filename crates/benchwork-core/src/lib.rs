//! `benchwork-core` — Core domain types, workspace aggregation, and multi-crate services.

#![forbid(unsafe_code)]
#![warn(missing_debug_implementations)]

pub mod capabilities;
pub mod config_service;
pub mod config_types;
pub mod dag_service;
pub mod error;
pub mod hub_service;
pub mod model;
pub mod spec_studio;
pub mod xray_service;

pub use capabilities::scan_capabilities;
pub use config_service::{read_sawhorse_config, test_inference_slot, write_sawhorse_config};
pub use config_types::{
    RoleOverrideConfig, TestInferenceReceipt, TestInferenceRequest, UniversalModelConfig,
};
pub use dag_service::{
    claim_task_lease, get_dag_view, get_task_briefing, link_tasks_service, record_task_handoff,
    split_task_service, update_task_details,
};
pub use error::{BenchworkError, Result};
pub use hub_service::{delete_spool_trace, get_model_hub_status, ping_inference};
pub use model::*;
pub use spec_studio::{load_spec_bundle, preview_contract, resolve_decision};
pub use storypole_core::model::decision::HandoffPacket;
pub use storypole_core::model::task::{TaskScope, TaskStatus};
pub use storypole_core::ops::mutations::UpdateTaskParams;
pub use xray_service::{compile_hole_grammar, list_patterns, trigger_synthesis};

use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::sync::broadcast;

/// Primary facade for accessing and mutating workspace state across crates.
#[derive(Debug, Clone)]
pub struct BenchworkState {
    /// Workspace root filesystem path.
    pub root_path: PathBuf,
    /// Channel for broadcasting live updates to SSE/WS subscribers.
    pub event_tx: broadcast::Sender<LiveEvent>,
}

impl BenchworkState {
    /// Initializes a new `BenchworkState` instance for the given root path.
    pub fn new(root_path: impl Into<PathBuf>) -> Self {
        let (event_tx, _) = broadcast::channel(256);
        Self {
            root_path: root_path.into(),
            event_tx,
        }
    }

    /// Scans workspace capabilities.
    pub fn capabilities(&self) -> Result<WorkspaceCapabilities> {
        scan_capabilities(&self.root_path)
    }

    /// Captures a complete UI snapshot of the current workspace state.
    pub fn snapshot(&self) -> Result<UiSnapshot> {
        let capabilities = self.capabilities()?;
        let dag = get_dag_view(&self.root_path, &DagQuery::default())?;
        let spec_summary = load_spec_bundle(&self.root_path)?;
        let hub_status = get_model_hub_status(&self.root_path)?;

        let timestamp_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        Ok(UiSnapshot {
            capabilities,
            dag,
            spec_summary,
            spool_traces_count: hub_status.spool_traces.len(),
            timestamp_ms,
        })
    }
}
