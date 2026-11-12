//! SSE stream of flight-recorder spans (`GB-243` AC4c).
//!
//! Deliberately *not* built on the in-process broadcast that `/api/v1/events` uses. Those events are
//! produced by this daemon; spans are produced by every other process in the suite - a gate run, an MCP
//! server, a CLI - so the channel that carries them has to be the file. This route tails
//! `.gaugeblock/telemetry/events.jsonl` and pushes what appears.
//!
//! The poll interval is a compromise rather than a tunable: a span is worth seeing promptly and the read
//! is an offset seek, so 400 ms costs nothing measurable while keeping the browser's event rate sane.

use std::collections::VecDeque;
use std::convert::Infallible;
use std::time::Duration;

use axum::response::sse::{Event, KeepAlive, Sse};
use benchwork_core::telemetry_tail::TelemetryTail;
use futures::Stream;
use gaugeblock_contracts::TelemetrySpan;
use std::path::Path;

const POLL_INTERVAL: Duration = Duration::from_millis(400);

/// GET /api/v1/telemetry/stream — one SSE event per span as it is appended.
pub async fn telemetry_stream() -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let stream = futures::stream::unfold(
        (TelemetryTail::new(events_path()), VecDeque::new()),
        |(mut tail, mut queue): (TelemetryTail, VecDeque<TelemetrySpan>)| async move {
            loop {
                if let Some(span) = queue.pop_front() {
                    // A span that will not serialise is announced rather than dropped: a silent gap in a
                    // waterfall is worse than a visible marker that one record was unreadable.
                    let event = Event::default()
                        .event("span")
                        .json_data(&span)
                        .unwrap_or_else(|_| Event::default().event("unreadable").data("span"));
                    return Some((Ok(event), (tail, queue)));
                }
                if let Ok(spans) = tail.poll() {
                    queue.extend(spans);
                }
                // A read error is retried on the next tick: the log may be mid-rotation, and a viewer
                // losing its stream over that would be a worse outcome than a brief pause.
                tokio::time::sleep(POLL_INTERVAL).await;
            }
        },
    );

    Sse::new(stream).keep_alive(KeepAlive::default())
}

/// Resolves the log through the suite-aware sink, so a member tails the suite's telemetry (`GB-189`, `GB-293`).
///
/// It used to resolve through `GaugeblockPaths::discover`, which reports the checkout the daemon happens to be
/// running in. Telemetry centralises at the suite root (`GB-338`), so a daemon started inside a member tailed a
/// file nothing writes: the panel showed "nothing yet" while the suite log filled up. Same mistake as rabbet's
/// ingest (`GB-304`), found by the same test shape - from a member, the repo-local answer and the suite answer
/// differ, and only the suite one is right.
///
/// Returns an empty path when the directory is not a repository, which the tailer reports as "nothing yet"
/// rather than an error.
fn events_path() -> std::path::PathBuf {
    std::env::current_dir()
        .map(|cwd| events_path_in(&cwd))
        .unwrap_or_default()
}

/// [`events_path`] for a known directory, so the resolution can be tested without moving the process.
pub fn events_path_in(cwd: &Path) -> std::path::PathBuf {
    gaugeblock_workspace::sink_path(cwd).unwrap_or_default()
}
