//! Axum daemon server, router configuration, and embedded UI asset serving.

pub mod routes_dag;
pub mod routes_docs;
pub mod routes_migration;
pub mod routes_state;
pub mod routes_synth;
pub mod streams;

use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use axum::extract::Request;
use axum::http::header::{CONTENT_TYPE, HeaderMap};
use axum::http::{StatusCode, Uri};
use axum::response::{Html, IntoResponse, Response};
use axum::routing::{delete, get, post};
use axum::Router;
use benchwork_core::model::LiveEvent;
use benchwork_core::BenchworkState;
use rust_embed::RustEmbed;
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info};

use crate::args::UpArgs;
use routes_state::DaemonContext;

/// Embedded production web UI distribution bundle.
#[derive(RustEmbed)]
#[folder = "../../web/dist"]
struct WebAssets;

/// Server configuration and proxy options.
#[derive(Debug, Clone)]
struct ServerConfig {
    dev_proxy: bool,
    static_dir: Option<PathBuf>,
}

/// Spawns the Axum daemon server on the specified host and port.
pub async fn start_daemon(
    root_path: PathBuf,
    args: UpArgs,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let state = BenchworkState::new(root_path);
    let daemon_ctx = Arc::new(DaemonContext {
        state: state.clone(),
    });
    let server_cfg = Arc::new(ServerConfig {
        dev_proxy: args.dev,
        static_dir: args.static_dir,
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api_router = Router::new()
        .route("/api/v1/capabilities", get(routes_state::get_capabilities))
        .route("/api/v1/snapshot", get(routes_state::get_snapshot))
        .route("/api/v1/spec", get(routes_state::get_spec))
        .route("/api/v1/spec/decide", post(routes_state::post_decide))
        .route(
            "/api/v1/spec/contract-preview",
            post(routes_state::post_contract_preview),
        )
        .route("/api/v1/dag", get(routes_dag::get_dag))
        .route(
            "/api/v1/dag/{id}/briefing",
            get(routes_dag::get_task_briefing_handler),
        )
        .route(
            "/api/v1/dag/{id}/claim",
            post(routes_dag::post_claim_task_handler),
        )
        .route(
            "/api/v1/dag/{id}/handoff",
            post(routes_dag::post_record_handoff_handler),
        )
        .route(
            "/api/v1/dag/{id}/update",
            post(routes_dag::post_update_task_handler),
        )
        .route(
            "/api/v1/dag/{id}/link",
            post(routes_dag::post_link_tasks_handler),
        )
        .route(
            "/api/v1/dag/{id}/split",
            post(routes_dag::post_split_task_handler),
        )
        .route(
            "/api/v1/dag/{id}/archive",
            post(routes_dag::post_archive_task_handler),
        )
        .route(
            "/api/v1/dag/{id}/unarchive",
            post(routes_dag::post_unarchive_task_handler),
        )
        .route("/api/v1/xray/patterns", get(routes_synth::get_patterns))
        .route(
            "/api/v1/xray/compile-hole",
            post(routes_synth::post_compile_hole),
        )
        .route(
            "/api/v1/synthesis/run",
            post(routes_synth::post_synthesis_run),
        )
        .route("/api/v1/hub/models", get(routes_synth::get_hub_status))
        .route("/api/v1/hub/spool", get(routes_synth::get_hub_spool))
        .route(
            "/api/v1/hub/spool/{trace_id}",
            delete(routes_synth::delete_spool_trace_handler),
        )
        .route("/api/v1/hub/ping", post(routes_synth::post_hub_ping))
        .route(
            "/api/v1/hub/config",
            get(routes_synth::get_hub_config).post(routes_synth::post_hub_config),
        )
        .route(
            "/api/v1/hub/test-inference",
            post(routes_synth::post_test_inference),
        )
        .route("/api/v1/docs/audit", get(routes_docs::get_docs_audit))
        .route(
            "/api/v1/docs/config",
            get(routes_docs::get_docs_config_handler)
                .post(routes_docs::post_docs_config_handler),
        )
        .route(
            "/api/v1/docs/scaffold",
            post(routes_docs::post_docs_scaffold_handler),
        )
        .route(
            "/api/v1/docs/migrate",
            post(routes_docs::post_docs_migrate_handler),
        )
        .route(
            "/api/v1/migration/plan",
            get(routes_migration::get_migration_plan),
        )
        .route(
            "/api/v1/migration/execute",
            post(routes_migration::post_execute_migration),
        )
        .route("/api/v1/ws", get(streams::ws_handler))
        .route("/api/v1/events", get(streams::sse_handler))
        .layer(cors)
        .with_state(daemon_ctx);

    let app = api_router.fallback({
        let cfg = server_cfg.clone();
        move |uri: Uri, req: Request| handle_static(uri, req, cfg)
    });

    // Start background heartbeat task
    let event_tx = state.event_tx.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(15));
        loop {
            interval.tick().await;
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;
            let _ = event_tx.send(LiveEvent::Heartbeat { timestamp_ms: now });
        }
    });

    let addr: SocketAddr = format!("{}:{}", args.host, args.port).parse()?;
    info!("benchwork daemon listening on http://{addr}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn handle_static(uri: Uri, _req: Request, cfg: Arc<ServerConfig>) -> impl IntoResponse {
    if cfg.dev_proxy {
        return forward_to_dev_server(uri).await.into_response();
    }

    let mut path = uri.path().trim_start_matches('/').to_string();
    if path.is_empty() {
        path = "index.html".to_string();
    }

    if let Some(ref dir) = cfg.static_dir {
        let file_path = dir.join(&path);
        if file_path.is_file()
            && let Ok(bytes) = std::fs::read(&file_path)
        {
            let mime = mime_guess::from_path(&file_path)
                .first_or_octet_stream()
                .as_ref()
                .to_string();
            return ([(CONTENT_TYPE, mime)], bytes).into_response();
        }
    }

    match WebAssets::get(&path) {
        Some(content) => {
            let mime = mime_guess::from_path(&path).first_or_octet_stream().to_string();
            ([(CONTENT_TYPE, mime)], content.data.into_owned()).into_response()
        }
        None => match WebAssets::get("index.html") {
            Some(fallback) => Html(fallback.data.into_owned()).into_response(),
            None => (StatusCode::NOT_FOUND, "UI not found").into_response(),
        },
    }
}

async fn forward_to_dev_server(uri: Uri) -> Response {
    let client = reqwest::Client::new();
    let query = uri.path_and_query().map(|pq| pq.as_str()).unwrap_or("/");
    let dev_url = format!("http://127.0.0.1:5173{query}");
    match client.get(&dev_url).send().await {
        Ok(resp) => {
            let status = StatusCode::from_u16(resp.status().as_u16()).unwrap_or(StatusCode::OK);
            let mut headers = HeaderMap::new();
            if let Some(ct) = resp.headers().get(reqwest::header::CONTENT_TYPE)
                && let Ok(val) = ct.to_str()
            {
                headers.insert(
                    CONTENT_TYPE,
                    val.parse().unwrap_or(axum::http::HeaderValue::from_static(
                        "application/octet-stream",
                    )),
                );
            }
            let bytes = resp.bytes().await.unwrap_or_default();
            (status, headers, bytes).into_response()
        }
        Err(e) => {
            error!("Vite dev proxy error: {e}");
            (
                StatusCode::BAD_GATEWAY,
                format!("Failed forwarding to Vite dev server at 127.0.0.1:5173: {e}"),
            )
                .into_response()
        }
    }
}
