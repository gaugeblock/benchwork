//! Multi-step chat orchestrator, dual-mode tool parser, and proposal lifecycle.

use serde::{Deserialize, Serialize};
use std::path::Path;

use super::context_injector::UiViewportContext;
use super::telemetry_spool::{spool_gold_dpo, spool_silver_sft};
use super::{ChatLedgerEvent, append_chat_event};
use crate::error::Result;

/// Typed event emitted across the Server-Sent Events (SSE) stream.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ChatStreamEvent {
    TextDelta {
        delta: String,
    },
    ToolCallStart {
        call_id: String,
        tool_name: String,
    },
    ToolResult {
        call_id: String,
        output_json: String,
    },
    ToolProposal {
        proposal_id: String,
        tool_name: String,
        payload_json: String,
    },
    Done {
        turn_id: String,
        total_tokens: u32,
    },
    Error {
        message: String,
    },
}

/// Request payload for streaming a chat turn.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ChatTurnRequest {
    pub thread_id: String,
    pub user_message: String,
    pub viewport: UiViewportContext,
    #[serde(default)]
    pub role: Option<String>,
}

/// Request payload to approve, reject, or edit a staged tool proposal.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ApplyProposalRequest {
    pub thread_id: String,
    pub proposal_id: String,
    pub tool_name: String,
    pub payload_json: String,
    pub approved: bool,
    #[serde(default)]
    pub edited_payload_json: Option<String>,
}

/// Extracts `<tool_call>{"name": "...", "arguments": ...}</tool_call>` from text.
pub fn extract_xml_tool_calls(text: &str) -> Vec<(String, String)> {
    let mut results = Vec::new();
    let mut cursor = text;
    while let Some(start) = cursor.find("<tool_call>") {
        let after_start = &cursor[start + 11..];
        if let Some(end) = after_start.find("</tool_call>") {
            let inner = after_start[..end].trim();
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(inner)
                && let (Some(name), Some(args)) = (
                    val.get("name").and_then(|n| n.as_str()),
                    val.get("arguments"),
                )
            {
                results.push((name.to_string(), args.to_string()));
            }
            cursor = &after_start[end + 12..];
        } else {
            break;
        }
    }
    results
}

/// Applies human resolution to a staged proposal and triggers telemetry spooling.
pub fn apply_proposal(root_dir: &Path, req: &ApplyProposalRequest) -> Result<String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    // Record ProposalResolved event in threads.jsonl
    append_chat_event(
        root_dir,
        &ChatLedgerEvent::ProposalResolved {
            thread_id: req.thread_id.clone(),
            proposal_id: req.proposal_id.clone(),
            approved: req.approved,
            resolution_notes: req.edited_payload_json.clone(),
            resolved_at_ms: now,
        },
    )?;

    // Telemetry spooling: Silver SFT on clean approve, Gold DPO on edit or reject
    if req.approved {
        if let Some(ref edited) = req.edited_payload_json {
            spool_gold_dpo(
                root_dir,
                &req.tool_name,
                edited,
                &req.payload_json,
                &req.tool_name,
                &req.proposal_id,
            )?;
        } else {
            spool_silver_sft(
                root_dir,
                &req.tool_name,
                &req.payload_json,
                &req.tool_name,
                &req.proposal_id,
            )?;
        }
    } else {
        spool_gold_dpo(
            root_dir,
            &req.tool_name,
            "rejected_by_user",
            &req.payload_json,
            &req.tool_name,
            &req.proposal_id,
        )?;
    }

    Ok(format!(
        "Proposal {} resolved (approved: {})",
        req.proposal_id, req.approved
    ))
}
