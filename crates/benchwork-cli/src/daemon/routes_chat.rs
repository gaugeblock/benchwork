//! Axum HTTP routes for chat streaming, proposal resolution, and autocomplete.

use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::response::sse::{Event, KeepAlive, Sse};
use futures::{Stream, StreamExt};
use sawhorse_core::config::schema::SawhorseConfig;
use sawhorse_core::router::RoleRouter;
use sawhorse_core::types::{InferenceRequest, ModelRole};
use serde_json::json;
use tokio_stream::wrappers::ReceiverStream;

use benchwork_core::chat_harness::context_injector::inject_turn_context;
use benchwork_core::chat_harness::orchestrator::{
    ApplyProposalRequest, ChatStreamEvent, ChatTurnRequest, apply_proposal,
};
use benchwork_core::chat_harness::tool_registry::list_suite_tools;
use benchwork_core::chat_harness::{
    ChatLedgerEvent, ChatMessage, ChatRole, append_chat_event, load_threads,
};

use super::routes_state::DaemonContext;

/// POST /api/v1/chat/stream — Server-Sent Events stream for a chat turn with real Sawhorse inference.
pub async fn handle_chat_stream(
    State(ctx): State<Arc<DaemonContext>>,
    Json(req): Json<ChatTurnRequest>,
) -> Sse<impl Stream<Item = std::result::Result<Event, Infallible>>> {
    let root = ctx.state.root_path.clone();
    let thread_id = req.thread_id.clone();
    let user_msg = req.user_message.clone();
    let viewport = req.viewport.clone();
    let role_param = req.role.clone();

    let (tx, rx) = tokio::sync::mpsc::channel::<std::result::Result<Event, Infallible>>(32);

    tokio::spawn(async move {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        let msg_id = format!("msg_{now}");
        let _ = append_chat_event(
            &root,
            &ChatLedgerEvent::MessageAppended {
                thread_id: thread_id.clone(),
                message: ChatMessage {
                    id: msg_id,
                    role: ChatRole::User,
                    content: user_msg.clone(),
                    timestamp_ms: now,
                    token_count: None,
                },
            },
        );

        let content = match inject_turn_context(&user_msg, &root, &viewport) {
            Ok(c) => c,
            Err(e) => {
                send_sse_event(&tx, "error", &ChatStreamEvent::Error { message: e.to_string() }).await;
                return;
            }
        };

        let gb_config_path = root.join(".gaugeblock").join("config.toml");
        let sawhorse_path = root.join("sawhorse.toml");
        let sawhorse_cfg = if gb_config_path.is_file() {
            SawhorseConfig::load_from_path(&gb_config_path)
                .unwrap_or_else(|_| SawhorseConfig::discover().unwrap_or_default())
        } else if sawhorse_path.is_file() {
            SawhorseConfig::load_from_path(&sawhorse_path)
                .unwrap_or_else(|_| SawhorseConfig::discover().unwrap_or_default())
        } else {
            SawhorseConfig::discover().unwrap_or_default()
        };

        let router = match RoleRouter::from_config(sawhorse_cfg) {
            Ok(r) => r,
            Err(e) => {
                send_sse_event(&tx, "error", &ChatStreamEvent::Error { message: e.to_string() }).await;
                return;
            }
        };

        let role = match role_param.as_deref().map(|s| s.to_lowercase()).as_deref() {
            Some("oracle") => ModelRole::Oracle,
            Some("system1_router") | Some("system1router") => ModelRole::System1Router,
            Some("hole_filler") | Some("holefiller") => ModelRole::HoleFiller,
            _ => ModelRole::Planner,
        };

        let inf_req = InferenceRequest::new(role, &content);
        let mut stream = match router.complete_stream(&inf_req).await {
            Ok(s) => s,
            Err(err) => {
                send_sse_event(&tx, "error", &ChatStreamEvent::Error { message: err.to_string() }).await;
                return;
            }
        };

        let mut full_response = String::new();
        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(token) => {
                    full_response.push_str(&token);
                    send_sse_event(&tx, "text_delta", &ChatStreamEvent::TextDelta { delta: token }).await;
                }
                Err(err) => {
                    send_sse_event(&tx, "error", &ChatStreamEvent::Error { message: err.to_string() }).await;
                    break;
                }
            }
        }

        let asst_msg_id = format!("msg_asst_{now}");
        let _ = append_chat_event(
            &root,
            &ChatLedgerEvent::MessageAppended {
                thread_id: thread_id.clone(),
                message: ChatMessage {
                    id: asst_msg_id,
                    role: ChatRole::Assistant,
                    content: full_response.clone(),
                    timestamp_ms: now,
                    token_count: Some((full_response.len() / 4) as u32),
                },
            },
        );

        let done = ChatStreamEvent::Done {
            turn_id: format!("turn_{now}"),
            total_tokens: (full_response.len() / 4) as u32,
        };
        send_sse_event(&tx, "done", &done).await;
    });

    let stream = ReceiverStream::new(rx);
    Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
}

async fn send_sse_event(
    tx: &tokio::sync::mpsc::Sender<std::result::Result<Event, Infallible>>,
    event_name: &str,
    payload: &ChatStreamEvent,
) {
    if let Ok(data) = serde_json::to_string(payload) {
        let _ = tx.send(Ok(Event::default().event(event_name).data(data))).await;
    }
}

/// POST /api/v1/chat/apply-proposal — Applies human approval/rejection to a staged proposal.
pub async fn handle_apply_proposal(
    State(ctx): State<Arc<DaemonContext>>,
    Json(req): Json<ApplyProposalRequest>,
) -> impl IntoResponse {
    match apply_proposal(&ctx.state.root_path, &req) {
        Ok(msg) => (
            StatusCode::OK,
            Json(json!({ "status": "ok", "message": msg })),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "status": "error", "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/chat/threads — Lists all conversation threads.
pub async fn handle_get_threads(State(ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    match load_threads(&ctx.state.root_path) {
        Ok(threads) => (StatusCode::OK, Json(json!({ "threads": threads }))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "status": "error", "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/chat/autocomplete — Returns @ references and / commands for context injection.
pub async fn handle_get_autocomplete(State(_ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    let commands = vec![
        json!({ "command": "/grill-me", "description": "Interactive architectural interview" }),
        json!({ "command": "/disentangle", "description": "Classify brownfield sections into 9 docs" }),
        json!({ "command": "/plan", "description": "Synthesize a structured execution DAG" }),
    ];

    let tools = list_suite_tools();

    (
        StatusCode::OK,
        Json(json!({
            "commands": commands,
            "tools": tools,
        })),
    )
}
