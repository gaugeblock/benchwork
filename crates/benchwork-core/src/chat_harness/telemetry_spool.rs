//! Telemetry spooling: Silver SFT & Gold DPO trace generation into `.gaugeblock/spool/outbox.jsonl`.

use std::fs::{OpenOptions, create_dir_all};
use std::io::Write;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::Result;

/// Classification of training trace.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TraceKind {
    SilverSft,
    GoldDpo,
}

/// Training trace logged to `.gaugeblock/spool/outbox.jsonl` for distillation by `rabbet`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SpoolTrace {
    pub trace_id: String,
    pub model_role: String,
    pub kind: TraceKind,
    pub prompt: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completion: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chosen: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rejected: Option<String>,
    pub proposal_id: String,
    pub tool_name: String,
    pub timestamp_ms: u64,
}

/// Returns the path to `.gaugeblock/spool/outbox.jsonl`.
pub fn spool_outbox_path(root_dir: &Path) -> PathBuf {
    root_dir
        .join(".gaugeblock")
        .join("spool")
        .join("outbox.jsonl")
}

/// Appends a trace to `.gaugeblock/spool/outbox.jsonl`.
fn append_trace(root_dir: &Path, trace: &SpoolTrace) -> Result<()> {
    let path = spool_outbox_path(root_dir);
    if let Some(parent) = path.parent() {
        create_dir_all(parent)?;
    }
    let mut file = OpenOptions::new().create(true).append(true).open(&path)?;
    let line = serde_json::to_string(trace)?;
    writeln!(file, "{line}")?;
    Ok(())
}

/// Records a Silver SFT trace when a proposal is approved without modification.
pub fn spool_silver_sft(
    root_dir: &Path,
    prompt: &str,
    completion: &str,
    tool_name: &str,
    proposal_id: &str,
) -> Result<()> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let trace = SpoolTrace {
        trace_id: Uuid::new_v4().to_string(),
        model_role: "planner".to_string(),
        kind: TraceKind::SilverSft,
        prompt: prompt.to_string(),
        completion: Some(completion.to_string()),
        chosen: None,
        rejected: None,
        proposal_id: proposal_id.to_string(),
        tool_name: tool_name.to_string(),
        timestamp_ms: now,
    };
    append_trace(root_dir, &trace)
}

/// Records a Gold DPO preference pair when a proposal is edited or regenerated.
pub fn spool_gold_dpo(
    root_dir: &Path,
    prompt: &str,
    chosen: &str,
    rejected: &str,
    tool_name: &str,
    proposal_id: &str,
) -> Result<()> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let trace = SpoolTrace {
        trace_id: Uuid::new_v4().to_string(),
        model_role: "planner".to_string(),
        kind: TraceKind::GoldDpo,
        prompt: prompt.to_string(),
        completion: None,
        chosen: Some(chosen.to_string()),
        rejected: Some(rejected.to_string()),
        proposal_id: proposal_id.to_string(),
        tool_name: tool_name.to_string(),
        timestamp_ms: now,
    };
    append_trace(root_dir, &trace)
}
