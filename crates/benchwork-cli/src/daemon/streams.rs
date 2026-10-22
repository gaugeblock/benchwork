//! WebSocket and Server-Sent Events (SSE) live streaming handlers.

use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::State;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::response::IntoResponse;
use axum::response::sse::{Event, KeepAlive, Sse};
use futures::{Stream, StreamExt};
use tokio_stream::wrappers::BroadcastStream;

use super::routes_state::DaemonContext;

/// GET /api/v1/ws — WebSocket live event upgrade handler.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(ctx): State<Arc<DaemonContext>>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, ctx))
}

async fn handle_socket(mut socket: WebSocket, ctx: Arc<DaemonContext>) {
    let mut rx = ctx.state.event_tx.subscribe();

    loop {
        tokio::select! {
            event = rx.recv() => {
                match event {
                    Ok(evt) => {
                        if let Ok(msg_text) = serde_json::to_string(&evt)
                            && socket.send(Message::Text(msg_text.into())).await.is_err()
                        {
                            break;
                        }
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                }
            }
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Ping(payload))) => {
                        if socket.send(Message::Pong(payload)).await.is_err() {
                            break;
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
        }
    }
}

/// GET /api/v1/events — Server-Sent Events (SSE) handler.
pub async fn sse_handler(
    State(ctx): State<Arc<DaemonContext>>,
) -> Sse<impl Stream<Item = std::result::Result<Event, Infallible>>> {
    let rx = ctx.state.event_tx.subscribe();
    let stream = BroadcastStream::new(rx).filter_map(|res| async move {
        match res {
            Ok(event) => {
                let data = serde_json::to_string(&event).unwrap_or_default();
                Some(Ok(Event::default().data(data)))
            }
            Err(_) => None,
        }
    });

    Sse::new(stream).keep_alive(KeepAlive::new().interval(Duration::from_secs(15)))
}
