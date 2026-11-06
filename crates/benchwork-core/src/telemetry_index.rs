//! SQLite index over the flight-recorder log (`GB-243` AC4b).
//!
//! The log is the source of truth and this is a cache: delete the database and it rebuilds by re-tailing
//! from offset zero. That inversion is what keeps `rusqlite` out of every other tool - the nine crates
//! that only append spans never link a database.
//!
//! Two consequences shape the schema:
//!
//! 1. **Insert is idempotent.** A restart, a rotation or a re-tail replays spans that were already
//!    indexed, so the key is the span's own id and the insert is `OR IGNORE`. Without that, every viewer
//!    restart would inflate the percentile tables.
//! 2. **Queries are trace-shaped.** The waterfall asks for one trace's spans in time order, which is what
//!    the `trace_id` index serves; the Law 12 rollups scan by time, which `started_at_ms` serves.
//!
//! Ids are stored as `TEXT` so the file stays inspectable with the `sqlite3` CLI - worth more here than
//! sixteen bytes a row.

use std::path::Path;
use std::time::Duration;

use gaugeblock_contracts::TelemetrySpan;
use rusqlite::{Connection, params};
use uuid::Uuid;

/// Failures from the telemetry index.
#[derive(Debug, thiserror::Error)]
pub enum TelemetryIndexError {
    /// The underlying database reported a failure.
    #[error("telemetry index: {0}")]
    Sqlite(#[from] rusqlite::Error),
}

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS spans (
    span_id            TEXT PRIMARY KEY,
    trace_id           TEXT NOT NULL,
    parent_span_id     TEXT,
    binary             TEXT NOT NULL,
    command            TEXT,
    task_key           TEXT,
    branch             TEXT,
    status             TEXT NOT NULL,
    started_at_ms      INTEGER NOT NULL,
    duration_ms        INTEGER,
    first_diagnostic   TEXT,
    worktree_diff_hash TEXT
);
CREATE INDEX IF NOT EXISTS spans_by_trace ON spans (trace_id, started_at_ms);
CREATE INDEX IF NOT EXISTS spans_by_time  ON spans (started_at_ms);
";

const INSERT: &str = "INSERT OR IGNORE INTO spans (
        span_id, trace_id, parent_span_id, binary, command, task_key,
        branch, status, started_at_ms, duration_ms, first_diagnostic, worktree_diff_hash
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)";

/// One row of a trace as the waterfall consumes it: span id, command, start, duration.
///
/// Named because clippy is right that the bare tuple is unreadable at a call site, and because the
/// waterfall panel is the next consumer — `row.0` there would be a debugging tax on every future reader.
pub type TraceSpanRow = (String, Option<String>, u64, Option<u64>);

/// A queryable cache of spans read from `.gaugeblock/telemetry/events.jsonl`.
#[derive(Debug)]
pub struct TelemetryIndex {
    connection: Connection,
}

impl TelemetryIndex {
    /// Opens (or creates) an index at `path`.
    ///
    /// # Errors
    ///
    /// Returns [`TelemetryIndexError`] when the file cannot be opened or the schema cannot be applied.
    pub fn open(path: &Path) -> Result<Self, TelemetryIndexError> {
        Self::prepare(Connection::open(path)?)
    }

    /// Opens an index that lives only in memory, for tests and for a viewer without write access.
    ///
    /// # Errors
    ///
    /// Returns [`TelemetryIndexError`] when the schema cannot be applied.
    pub fn open_in_memory() -> Result<Self, TelemetryIndexError> {
        Self::prepare(Connection::open_in_memory()?)
    }

    fn prepare(connection: Connection) -> Result<Self, TelemetryIndexError> {
        // WAL so the tailer writes while a viewer reads; `busy_timeout` so a brief overlap retries
        // rather than failing a poll. The same settings storypole's ledger index uses.
        connection.pragma_update(None, "journal_mode", "WAL")?;
        connection.pragma_update(None, "synchronous", "NORMAL")?;
        connection.busy_timeout(Duration::from_millis(5_000))?;
        connection.execute_batch(SCHEMA)?;
        Ok(Self { connection })
    }

    /// Records one span, ignoring a span id that is already present.
    ///
    /// # Errors
    ///
    /// Returns [`TelemetryIndexError`] when the insert fails for a reason other than duplication.
    pub fn insert(&self, span: &TelemetrySpan) -> Result<(), TelemetryIndexError> {
        self.connection.execute(
            INSERT,
            params![
                span.span_id.to_string(),
                span.trace_id.to_string(),
                span.parent_span_id.map(|id| id.to_string()),
                span.binary,
                span.command,
                span.task_key,
                span.branch,
                format!("{:?}", span.status).to_lowercase(),
                span.started_at_ms as i64,
                span.duration_ms.map(|ms| ms as i64),
                span.first_diagnostic,
                span.worktree_diff_hash,
            ],
        )?;
        Ok(())
    }

    /// Inserts a batch in one transaction, returning how many spans were new.
    ///
    /// # Errors
    ///
    /// Returns [`TelemetryIndexError`] when the transaction fails.
    pub fn insert_all(&mut self, spans: &[TelemetrySpan]) -> Result<usize, TelemetryIndexError> {
        let transaction = self.connection.transaction()?;
        let mut added = 0;
        for span in spans {
            added += transaction.execute(
                INSERT,
                params![
                    span.span_id.to_string(),
                    span.trace_id.to_string(),
                    span.parent_span_id.map(|id| id.to_string()),
                    span.binary,
                    span.command,
                    span.task_key,
                    span.branch,
                    format!("{:?}", span.status).to_lowercase(),
                    span.started_at_ms as i64,
                    span.duration_ms.map(|ms| ms as i64),
                    span.first_diagnostic,
                    span.worktree_diff_hash,
                ],
            )?;
        }
        transaction.commit()?;
        Ok(added)
    }

    /// Spans belonging to one trace, oldest first - the waterfall's query.
    ///
    /// # Errors
    ///
    /// Returns [`TelemetryIndexError`] when the query fails.
    pub fn spans_for_trace(
        &self,
        trace_id: Uuid,
    ) -> Result<Vec<TraceSpanRow>, TelemetryIndexError> {
        let mut statement = self.connection.prepare(
            "SELECT span_id, command, started_at_ms, duration_ms
             FROM spans WHERE trace_id = ?1 ORDER BY started_at_ms ASC",
        )?;
        let rows = statement
            .query_map(params![trace_id.to_string()], |row| {
                let started_at_ms: i64 = row.get(2)?;
                let duration_ms: Option<i64> = row.get(3)?;
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    started_at_ms as u64,
                    duration_ms.map(|ms| ms as u64),
                ))
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(rows)
    }
}

#[cfg(test)]
mod tests {
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
}
