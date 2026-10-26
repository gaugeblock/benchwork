//! Unit tests for chat harness, context injection, tool parsing, and telemetry spooling.

#![allow(clippy::unwrap_used)]

use std::fs;
use tempfile::TempDir;

use super::context_injector::{
    UiViewportContext, build_environment_xml, expand_user_prompt, inject_turn_context,
};
use super::telemetry_spool::{spool_gold_dpo, spool_outbox_path, spool_silver_sft};
use super::tool_registry::{deserialize_maybe_stringified, is_proposal_tool, list_suite_tools};
use super::{ChatLedgerEvent, ChatMessage, ChatRole, append_chat_event, load_threads};

#[test]
fn test_environment_xml_envelope_generation() {
    let temp = TempDir::new().unwrap();
    let viewport = UiViewportContext {
        active_panel: "Panel2_Backlog".to_string(),
        focused_task_key: Some("GB-46".to_string()),
        focused_doc_archetype: None,
        focused_symbol: None,
    };
    let xml = build_environment_xml(temp.path(), &viewport);
    assert!(xml.contains("<gaugeblock_environment>"));
    assert!(xml.contains("<active_panel>Panel2_Backlog</active_panel>"));
    assert!(xml.contains("<focused_task>GB-46</focused_task>"));
    assert!(xml.contains("storypole_summary"));
}

#[test]
fn test_command_and_symbol_expansion() {
    let temp = TempDir::new().unwrap();
    let prompt = "Please check this /grill-me and /disentangle";
    let expanded = expand_user_prompt(prompt, temp.path()).unwrap();
    assert!(expanded.contains("Interview the user interactively"));
    assert!(expanded.contains("Classify brownfield markdown sections"));
}

#[test]
fn test_turn_context_injection() {
    let temp = TempDir::new().unwrap();
    let viewport = UiViewportContext {
        active_panel: "Panel1_Docs".to_string(),
        focused_task_key: None,
        focused_doc_archetype: Some("SPEC".to_string()),
        focused_symbol: None,
    };
    let turn = inject_turn_context("Hello agent", temp.path(), &viewport).unwrap();
    assert!(turn.starts_with("Hello agent"));
    assert!(turn.contains("<gaugeblock_environment>"));
    assert!(turn.contains("<active_panel>Panel1_Docs</active_panel>"));
}

#[derive(serde::Deserialize, PartialEq, Eq, Debug)]
struct NestedPayload {
    name: String,
    count: u32,
}

#[derive(serde::Deserialize, PartialEq, Eq, Debug)]
struct ToolEnvelope {
    #[serde(deserialize_with = "deserialize_maybe_stringified")]
    payload: NestedPayload,
}

#[test]
fn test_deserialize_maybe_stringified_raw_and_escaped() {
    // Case 1: Raw JSON object
    let raw_json = r#"{"payload":{"name":"miter","count":42}}"#;
    let decoded_raw: ToolEnvelope = serde_json::from_str(raw_json).unwrap();
    assert_eq!(decoded_raw.payload.name, "miter");
    assert_eq!(decoded_raw.payload.count, 42);

    // Case 2: Stringified JSON string (common with quantized GGUF / Single-Model Mode)
    let stringified_json = r#"{"payload":"{\"name\":\"miter\",\"count\":42}"}"#;
    let decoded_str: ToolEnvelope = serde_json::from_str(stringified_json).unwrap();
    assert_eq!(decoded_str.payload.name, "miter");
    assert_eq!(decoded_str.payload.count, 42);
}

#[test]
fn test_suite_tools_catalog_and_classification() {
    let tools = list_suite_tools();
    assert_eq!(tools.len(), 8);

    assert!(is_proposal_tool("propose_decision_hole"));
    assert!(is_proposal_tool("propose_doc_patch"));
    assert!(is_proposal_tool("propose_task_plan"));
    assert!(is_proposal_tool("trigger_joiner_run"));

    assert!(!is_proposal_tool("miter_inspect_scope"));
    assert!(!is_proposal_tool("storypole_query_tasks"));
    assert!(!is_proposal_tool("chalkline_check_drift"));
    assert!(!is_proposal_tool("dado_preview_contract"));
}

#[test]
fn test_chat_thread_persistence_lifecycle() {
    let temp = TempDir::new().unwrap();
    let thread_id = "thread-123";

    append_chat_event(
        temp.path(),
        &ChatLedgerEvent::ThreadCreated {
            thread_id: thread_id.to_string(),
            title: "Investigation Session".to_string(),
            created_at_ms: 1000,
        },
    )
    .unwrap();

    append_chat_event(
        temp.path(),
        &ChatLedgerEvent::MessageAppended {
            thread_id: thread_id.to_string(),
            message: ChatMessage {
                id: "msg-1".to_string(),
                role: ChatRole::User,
                content: "Investigate HITL card flow".to_string(),
                timestamp_ms: 1050,
                token_count: Some(12),
            },
        },
    )
    .unwrap();

    let threads = load_threads(temp.path()).unwrap();
    assert_eq!(threads.len(), 1);
    assert_eq!(threads[0].thread_id, thread_id);
    assert_eq!(threads[0].messages.len(), 1);
    assert_eq!(threads[0].messages[0].content, "Investigate HITL card flow");
}

#[test]
fn test_telemetry_spooling_sft_and_dpo() {
    let temp = TempDir::new().unwrap();
    spool_silver_sft(
        temp.path(),
        "Prompt 1",
        "Completion 1",
        "propose_task_plan",
        "prop-1",
    )
    .unwrap();
    spool_gold_dpo(
        temp.path(),
        "Prompt 2",
        "Chosen 2",
        "Rejected 2",
        "propose_decision_hole",
        "prop-2",
    )
    .unwrap();

    let outbox = fs::read_to_string(spool_outbox_path(temp.path())).unwrap();
    let lines: Vec<&str> = outbox.lines().collect();
    assert_eq!(lines.len(), 2);
    assert!(lines[0].contains("silver_sft"));
    assert!(lines[1].contains("gold_dpo"));
}
