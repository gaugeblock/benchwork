//! Synthesis and event models.

use batten_core::GrammarFormat;
use serde::{Deserialize, Serialize};

/// Request to compile a typed hole grammar using Batten.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HoleCompileRequest {
    /// Dado pattern ID.
    pub pattern_id: String,
    /// Hole identifier in the pattern.
    pub hole_id: String,
    /// Grammar format to compile.
    pub format: GrammarFormat,
}

/// Compiled grammar preview for a typed hole.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HoleCompileResponse {
    /// Pattern ID.
    pub pattern_id: String,
    /// Hole ID.
    pub hole_id: String,
    /// Expected Rust or TypeScript type.
    pub expected_type: String,
    /// Target grammar format.
    pub format: GrammarFormat,
    /// Compiled GBNF, Lark, or Regex grammar text.
    pub grammar_definition: String,
    /// In-scope identifiers admitted by the grammar.
    pub allowed_identifiers: Vec<String>,
}

/// Request to trigger synthesis.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SynthesisRunRequest {
    /// Specific task ID to synthesize, or None for next ready.
    pub task_id: Option<String>,
    /// Force in-process synthesis even if daemon detected.
    pub force_in_process: bool,
}

/// Live event broadcasted over WebSocket and SSE.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload", rename_all = "snake_case")]
pub enum LiveEvent {
    /// Heartbeat ping with timestamp.
    Heartbeat { timestamp_ms: u64 },
    /// Task status transition or ledger update.
    TaskUpdated { task_id: String, status: String },
    /// Decision resolution event.
    DecisionResolved { decision_id: String },
    /// Live synthesis log or token output.
    SynthesisStep {
        task_id: String,
        step: String,
        detail: String,
    },
    /// Synthesis run finished.
    SynthesisCompleted {
        task_id: String,
        success: bool,
        tier: Option<String>,
    },
    /// New spool entry added.
    SpoolUpdated { trace_count: usize },
}
