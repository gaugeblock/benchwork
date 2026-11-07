//! Tests for the telemetry index.
//!
//! A sibling file rather than an inline module: the projection logic and its tests together passed the
//! 250-line limit (`GB-291`), and the limit counts tests.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use super::*;
use gaugeblock_contracts::SpanStatus;

fn span(trace: Uuid, binary: &str, started: u64, duration: Option<u64>) -> TelemetrySpan {
    let mut span = TelemetrySpan::open(Uuid::new_v4(), binary, trace, started);
    span.status = SpanStatus::Ok;
    span.command = Some("complete".to_string());
    span.duration_ms = duration;
    span
}

#[test]
fn an_index_that_did_not_exist_is_created() {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("index.sqlite");
    let mut index = TelemetryIndex::open(&path).unwrap();

    let added = index.insert_all(&[span(Uuid::new_v4(), "miter", 10, Some(5))]);

    assert_eq!(added.unwrap(), 1);
    assert!(path.is_file());
}

#[test]
fn re_tailing_the_same_spans_does_not_inflate_the_index() {
    // Why inserts are OR IGNORE: a restart or a rotation replays lines already indexed, and a viewer
    // must not double-count them in its percentiles.
    let mut index = TelemetryIndex::open_in_memory().unwrap();
    let batch = vec![span(Uuid::new_v4(), "sawhorse", 100, Some(20))];

    assert_eq!(index.insert_all(&batch).unwrap(), 1);
    assert_eq!(index.insert_all(&batch).unwrap(), 0, "already indexed");
}

#[test]
fn one_trace_returns_its_spans_in_time_order() {
    let mut index = TelemetryIndex::open_in_memory().unwrap();
    let trace = Uuid::new_v4();
    index
        .insert_all(&[
            span(trace, "sawhorse", 200, Some(30)),
            span(trace, "outfeed", 100, Some(10)),
            span(Uuid::new_v4(), "other", 150, Some(1)),
        ])
        .unwrap();

    let spans = index.spans_for_trace(trace).unwrap();

    assert_eq!(spans.len(), 2, "a different trace is not included");
    assert_eq!(spans[0].2, 100, "oldest first, which is waterfall order");
    assert_eq!(spans[1].2, 200);
}
