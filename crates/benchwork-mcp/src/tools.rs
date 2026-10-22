//! Tool definitions and JSON-RPC dispatch handlers for `benchwork-mcp`.

use benchwork_core::model::{ResolveDecisionRequest, SynthesisRunRequest};
use benchwork_core::{BenchworkState, resolve_decision, scan_capabilities, trigger_synthesis};
use serde_json::{Value, json};
use std::path::PathBuf;
use tokio::sync::broadcast;

/// Returns JSON schemas for all registered MCP tools.
pub fn list_tools() -> Value {
    json!([
        {
            "name": "benchwork_capabilities",
            "description": "Scans workspace technical documentation, Storypole tasks, Dado patterns, Sawhorse configs, and Rabbet telemetry outbox.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "root_path": { "type": "string", "description": "Optional workspace root directory (defaults to current dir)." }
                }
            }
        },
        {
            "name": "benchwork_snapshot",
            "description": "Captures a complete UI snapshot containing workspace capabilities, DAG view, spec bundle, and telemetry trace counters.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "root_path": { "type": "string", "description": "Optional workspace root directory (defaults to current dir)." }
                }
            }
        },
        {
            "name": "benchwork_resolve_decision",
            "description": "Resolves a pending architectural decision hole, persisting rationale to Storypole and appending to SPEC.md.",
            "inputSchema": {
                "type": "object",
                "required": ["decision_id", "chosen_option", "rationale"],
                "properties": {
                    "root_path": { "type": "string", "description": "Optional workspace root directory." },
                    "task_id": { "type": "string", "description": "Associated task ID or ticket key." },
                    "decision_id": { "type": "string", "description": "UUID of the decision to resolve." },
                    "chosen_option": { "type": "string", "description": "Selected decision option text." },
                    "rationale": { "type": "string", "description": "Justification for the decision choice." },
                    "spawn_followup": { "type": "boolean", "description": "Whether to spawn a follow-up investigation decision." }
                }
            }
        },
        {
            "name": "benchwork_trigger_synthesis",
            "description": "Triggers Joiner neurosymbolic code synthesis on a specific task or next ready task.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "root_path": { "type": "string", "description": "Optional workspace root directory." },
                    "task_id": { "type": "string", "description": "Specific task ID to synthesize (defaults to next ready)." },
                    "force_in_process": { "type": "boolean", "description": "Force in-process execution instead of daemon relay." }
                }
            }
        }
    ])
}

/// Dispatches a tool invocation to its corresponding handler.
pub async fn dispatch_tool(tool_name: &str, arguments: &Value) -> Value {
    match tool_name {
        "benchwork_capabilities" => handle_capabilities(arguments),
        "benchwork_snapshot" => handle_snapshot(arguments),
        "benchwork_resolve_decision" => handle_resolve_decision(arguments),
        "benchwork_trigger_synthesis" => handle_trigger_synthesis(arguments).await,
        _ => json!({
            "content": [{ "type": "text", "text": format!("Unknown tool: {tool_name}") }],
            "isError": true
        }),
    }
}

fn resolve_root(arguments: &Value) -> PathBuf {
    arguments
        .get("root_path")
        .and_then(|v| v.as_str())
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("."))
}

fn handle_capabilities(args: &Value) -> Value {
    let root = resolve_root(args);
    match scan_capabilities(&root) {
        Ok(caps) => json!({
            "content": [{
                "type": "text",
                "text": serde_json::to_string_pretty(&caps).unwrap_or_default()
            }]
        }),
        Err(e) => json!({
            "content": [{ "type": "text", "text": format!("Failed scanning capabilities: {e}") }],
            "isError": true
        }),
    }
}

fn handle_snapshot(args: &Value) -> Value {
    let root = resolve_root(args);
    let state = BenchworkState::new(root);
    match state.snapshot() {
        Ok(snap) => json!({
            "content": [{
                "type": "text",
                "text": serde_json::to_string_pretty(&snap).unwrap_or_default()
            }]
        }),
        Err(e) => json!({
            "content": [{ "type": "text", "text": format!("Failed capturing snapshot: {e}") }],
            "isError": true
        }),
    }
}

fn handle_resolve_decision(args: &Value) -> Value {
    let root = resolve_root(args);
    let decision_id = match args.get("decision_id").and_then(|v| v.as_str()) {
        Some(d) => d.to_string(),
        None => {
            return json!({ "content": [{ "type": "text", "text": "Missing decision_id" }], "isError": true });
        }
    };
    let chosen_option = match args.get("chosen_option").and_then(|v| v.as_str()) {
        Some(c) => c.to_string(),
        None => {
            return json!({ "content": [{ "type": "text", "text": "Missing chosen_option" }], "isError": true });
        }
    };
    let rationale = match args.get("rationale").and_then(|v| v.as_str()) {
        Some(r) => r.to_string(),
        None => {
            return json!({ "content": [{ "type": "text", "text": "Missing rationale" }], "isError": true });
        }
    };
    let task_id = args
        .get("task_id")
        .and_then(|v| v.as_str())
        .map(ToString::to_string);
    let spawn_followup = args
        .get("spawn_followup")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let req = ResolveDecisionRequest {
        task_id,
        decision_id,
        chosen_option,
        rationale,
        spawn_followup,
    };

    match resolve_decision(&root, &req) {
        Ok(receipt) => json!({
            "content": [{
                "type": "text",
                "text": serde_json::to_string_pretty(&receipt).unwrap_or_default()
            }]
        }),
        Err(e) => json!({
            "content": [{ "type": "text", "text": format!("Failed resolving decision: {e}") }],
            "isError": true
        }),
    }
}

async fn handle_trigger_synthesis(args: &Value) -> Value {
    let root = resolve_root(args);
    let task_id = args
        .get("task_id")
        .and_then(|v| v.as_str())
        .map(ToString::to_string);
    let force_in_process = args
        .get("force_in_process")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let req = SynthesisRunRequest {
        task_id,
        force_in_process,
    };

    let (tx, _) = broadcast::channel(16);
    match trigger_synthesis(&root, &req, tx).await {
        Ok(()) => json!({
            "content": [{ "type": "text", "text": "Synthesis run triggered successfully." }]
        }),
        Err(e) => json!({
            "content": [{ "type": "text", "text": format!("Failed triggering synthesis: {e}") }],
            "isError": true
        }),
    }
}
