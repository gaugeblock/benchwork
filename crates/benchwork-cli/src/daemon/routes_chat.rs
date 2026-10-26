//! Axum HTTP routes for chat streaming, proposal resolution, and autocomplete.

use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;

use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::response::sse::{Event, KeepAlive, Sse};
use futures::Stream;
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

/// POST /api/v1/chat/stream — Server-Sent Events stream for a chat turn.
pub async fn handle_chat_stream(
    State(ctx): State<Arc<DaemonContext>>,
    Json(req): Json<ChatTurnRequest>,
) -> Sse<impl Stream<Item = std::result::Result<Event, Infallible>>> {
    let root = ctx.state.root_path.clone();
    let thread_id = req.thread_id.clone();
    let user_msg = req.user_message.clone();
    let viewport = req.viewport.clone();

    let (tx, rx) = tokio::sync::mpsc::channel::<std::result::Result<Event, Infallible>>(16);

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

        let injected = inject_turn_context(&user_msg, &root, &viewport);
        let content = match injected {
            Ok(c) => c,
            Err(e) => {
                let err_event = ChatStreamEvent::Error {
                    message: e.to_string(),
                };
                if let Ok(data) = serde_json::to_string(&err_event) {
                    let _ = tx
                        .send(Ok(Event::default().event("error").data(data)))
                        .await;
                }
                return;
            }
        };

        let delta = ChatStreamEvent::TextDelta {
            delta: format!(
                "Context initialized for {} on panel {}.",
                thread_id, viewport.active_panel
            ),
        };
        if let Ok(data) = serde_json::to_string(&delta) {
            let _ = tx
                .send(Ok(Event::default().event("text_delta").data(data)))
                .await;
        }

        let done = ChatStreamEvent::Done {
            turn_id: format!("turn_{now}"),
            total_tokens: (content.len() / 4) as u32,
        };
        if let Ok(data) = serde_json::to_string(&done) {
            let _ = tx.send(Ok(Event::default().event("done").data(data))).await;
        }
    });

    let stream = ReceiverStream::new(rx);
    Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
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
            Json(json!({ "error": e.to_string() })),
        ),
    }
}

/// GET /api/v1/chat/autocomplete — Returns suggestions for `@` and `/` pills.
pub async fn handle_get_autocomplete(State(_ctx): State<Arc<DaemonContext>>) -> impl IntoResponse {
    let commands = vec![
        json!({ "prefix": "/grill-me", "label": "/grill-me", "description": "Interactive interview mode" }),
        json!({ "prefix": "/disentangle", "label": "/disentangle", "description": "Classify brownfield doc sections" }),
        json!({ "prefix": "/plan", "label": "/plan <KEY>", "description": "Generate task plan blueprint" }),
    ];
    let tools = list_suite_tools()
        .into_iter()
        .map(|t| json!({ "name": t.name, "description": t.description, "kind": t.kind }))
        .collect::<Vec<_>>();

    (
        StatusCode::OK,
        Json(json!({ "commands": commands, "tools": tools })),
    )
}
