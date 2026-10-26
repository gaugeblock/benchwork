//! Tool definitions, Serde recovery helper, and proposal classification.

use serde::de::DeserializeOwned;
use serde::{Deserialize, Deserializer, Serialize};

/// Serde helper for resilient tool argument deserialization (modeled after Zed).
/// Models occasionally emit nested tool arguments as JSON-encoded strings.
pub fn deserialize_maybe_stringified<'de, T, D>(deserializer: D) -> std::result::Result<T, D::Error>
where
    T: DeserializeOwned,
    D: Deserializer<'de>,
{
    let raw_value = serde_json::Value::deserialize(deserializer)
        .map_err(|e| serde::de::Error::custom(format!("invalid JSON value: {e}")))?;

    match T::deserialize(&raw_value) {
        Ok(val) => Ok(val),
        Err(orig_err) => {
            let Some(s) = raw_value.as_str() else {
                return Err(serde::de::Error::custom(orig_err));
            };
            serde_json::from_str(s).map_err(serde::de::Error::custom)
        }
    }
}

/// Category of tool: either read-only automatic or staged human-in-the-loop proposal.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ToolKind {
    AutoRead,
    Proposal,
}

/// Schema definition for a tool available in the chat harness.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ToolDefinition {
    pub name: String,
    pub description: String,
    pub kind: ToolKind,
    pub parameters_schema_json: String,
}

/// Returns true if the tool requires explicit human approval before execution.
pub fn is_proposal_tool(tool_name: &str) -> bool {
    matches!(
        tool_name,
        "propose_decision_hole" | "propose_doc_patch" | "propose_task_plan" | "trigger_joiner_run"
    )
}

/// Arguments for `propose_decision_hole`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProposeDecisionArgs {
    pub question: String,
    pub options: Vec<String>,
    #[serde(default)]
    pub category: Option<String>,
}

/// Arguments for `propose_doc_patch`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProposeDocPatchArgs {
    pub target_doc: String,
    pub patch_summary: String,
    pub diff_content: String,
}

/// Arguments for `propose_task_plan`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProposeTaskPlanArgs {
    pub task_key: String,
    pub summary: String,
    pub steps: Vec<String>,
}

/// Arguments for `trigger_joiner_run`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TriggerJoinerArgs {
    pub target_crate: String,
    pub mode: String,
}

/// Complete catalog of all 8 tools exposed to the agent.
pub fn list_suite_tools() -> Vec<ToolDefinition> {
    vec![
        ToolDefinition {
            name: "miter_inspect_scope".to_string(),
            description: "Auto-read AST symbols, skeletons, and call graph blast radius".to_string(),
            kind: ToolKind::AutoRead,
            parameters_schema_json: r#"{"type":"object","properties":{"target_path":{"type":"string"}}}"#.to_string(),
        },
        ToolDefinition {
            name: "storypole_query_tasks".to_string(),
            description: "Auto-read Storypole backlog tasks, statuses, and dependency edges".to_string(),
            kind: ToolKind::AutoRead,
            parameters_schema_json: r#"{"type":"object","properties":{"status_filter":{"type":"string"}}}"#.to_string(),
        },
        ToolDefinition {
            name: "chalkline_check_drift".to_string(),
            description: "Auto-read doc drift analysis against .gaugeblock/docs.toml".to_string(),
            kind: ToolKind::AutoRead,
            parameters_schema_json: r#"{"type":"object","properties":{"path":{"type":"string"}}}"#.to_string(),
        },
        ToolDefinition {
            name: "dado_preview_contract".to_string(),
            description: "Auto-read AST contract preview with typed holes".to_string(),
            kind: ToolKind::AutoRead,
            parameters_schema_json: r#"{"type":"object","properties":{"pattern_id":{"type":"string"}}}"#.to_string(),
        },
        ToolDefinition {
            name: "propose_decision_hole".to_string(),
            description: "Stage an architectural question and options for human decision in Storypole".to_string(),
            kind: ToolKind::Proposal,
            parameters_schema_json: r#"{"type":"object","properties":{"question":{"type":"string"},"options":{"type":"array","items":{"type":"string"}}},"required":["question","options"]}"#.to_string(),
        },
        ToolDefinition {
            name: "propose_doc_patch".to_string(),
            description: "Stage a targeted documentation patch requiring human diff approval".to_string(),
            kind: ToolKind::Proposal,
            parameters_schema_json: r#"{"type":"object","properties":{"target_doc":{"type":"string"},"diff_content":{"type":"string"}},"required":["target_doc","diff_content"]}"#.to_string(),
        },
        ToolDefinition {
            name: "propose_task_plan".to_string(),
            description: "Stage a structured execution TaskPlan requiring human checklist approval".to_string(),
            kind: ToolKind::Proposal,
            parameters_schema_json: r#"{"type":"object","properties":{"task_key":{"type":"string"},"steps":{"type":"array","items":{"type":"string"}}},"required":["task_key","steps"]}"#.to_string(),
        },
        ToolDefinition {
            name: "trigger_joiner_run".to_string(),
            description: "Stage a neurosymbolic synthesis pass requiring human execution approval".to_string(),
            kind: ToolKind::Proposal,
            parameters_schema_json: r#"{"type":"object","properties":{"target_crate":{"type":"string"},"mode":{"type":"string"}},"required":["target_crate"]}"#.to_string(),
        },
    ]
}

