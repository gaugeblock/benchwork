//! Embedded asset serving and Vite development proxy handlers.

use std::path::PathBuf;
use std::sync::Arc;

use axum::extract::Request;
use axum::http::header::{CONTENT_TYPE, HeaderMap};
use axum::http::{StatusCode, Uri};
use axum::response::{Html, IntoResponse, Response};
use rust_embed::RustEmbed;
use tracing::error;

/// Embedded production web UI distribution bundle.
#[derive(Debug, RustEmbed)]
#[folder = "../../web/dist"]
pub struct WebAssets;

/// Server configuration and proxy options.
#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub dev_proxy: bool,
    pub static_dir: Option<PathBuf>,
}

/// Serves static files from embedded assets, static folder, or Vite dev proxy.
pub async fn handle_static(uri: Uri, _req: Request, cfg: Arc<ServerConfig>) -> impl IntoResponse {
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
            let mime = mime_guess::from_path(&path)
                .first_or_octet_stream()
                .to_string();
            ([(CONTENT_TYPE, mime)], content.data.into_owned()).into_response()
        }
        None => match WebAssets::get("index.html") {
            Some(fallback) => Html(fallback.data.into_owned()).into_response(),
            None => (StatusCode::NOT_FOUND, "UI not found").into_response(),
        },
    }
}

/// Forwards requests to the local Vite development server.
pub async fn forward_to_dev_server(uri: Uri) -> Response {
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
