//! Specification and decision models.

use chalkline_core::SharedTypeContract;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Detected documentation status in the workspace.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SpecDocsStatus {
    /// Whether `SPEC.md` exists as primary document.
    pub primary_spec_present: bool,
    /// Detected technical markdown filenames.
    pub detected_files: Vec<String>,
}

/// Aggregate bundle of specifications and contracts.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SpecBundle {
    /// Content of `SPEC.md` if present.
    pub primary_spec: Option<String>,
    /// Filename to content map for secondary docs.
    pub supporting_docs: BTreeMap<String, String>,
    /// Pending decision holes from storypole and chalkline.
    pub pending_decisions: Vec<PendingDecision>,
    /// Parsed or loaded shared type contracts.
    pub contracts: Vec<SharedTypeContract>,
}

/// Unresolved architectural or implementation decision.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PendingDecision {
    /// Associated Storypole task ID if linked.
    pub task_id: Option<String>,
    /// Unique identifier of the decision.
    pub decision_id: String,
    /// Question or prompt text.
    pub prompt: String,
    /// Available options.
    pub options: Vec<String>,
    /// Selected rationale if previously drafted.
    pub rationale: Option<String>,
    /// Source origin ("storypole" or "spec").
    pub source: String,
}

/// Request to resolve a pending decision.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ResolveDecisionRequest {
    /// Target task ID if associated.
    pub task_id: Option<String>,
    /// Decision identifier.
    pub decision_id: String,
    /// Chosen option text.
    pub chosen_option: String,
    /// Rationale explaining the choice.
    pub rationale: String,
    /// Whether to spawn a follow-up task or decision.
    pub spawn_followup: bool,
}

/// Receipt confirming resolution of a decision.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DecisionResolutionReceipt {
    /// Decision identifier.
    pub decision_id: String,
    /// Whether saved to `.storypole/ledger.jsonl`.
    pub applied_to_storypole: bool,
    /// Whether appended to `SPEC.md`.
    pub applied_to_spec: bool,
    /// Newly spawned task ID if requested.
    pub spawned_task_id: Option<String>,
}

/// Request to generate polyglot contracts from a `SharedTypeContract`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ContractPreviewRequest {
    /// Contract schema.
    pub contract: SharedTypeContract,
}

/// Generated polyglot code preview.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ContractPreviewResponse {
    /// Rust Serde struct code.
    pub rust_code: String,
    /// TypeScript interface code.
    pub typescript_code: String,
    /// Zod schema code.
    pub zod_code: String,
}
