//! Incremental reads of the flight-recorder log (`GB-243` AC4).
//!
//! Several processes append to `.gaugeblock/telemetry/events.jsonl` at once, so a tailer cannot assume
//! it is handed whole lines. Two rules follow, both about not mistaking a live writer for a corrupt file:
//!
//! 1. A line with no terminating newline is left in place and read on a later poll. Half a span is not
//!    an error, it is a span that has not been written yet.
//! 2. A line that fails to parse is skipped, not fatal. One bad record from an older schema must not
//!    hide everything after it.
//!
//! Position is an offset, not a line count, so a large log costs nothing to reopen. If the file shrinks
//! below the offset it was rotated or recreated and the cursor restarts at zero.

use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};

use gaugeblock_contracts::TelemetrySpan;

/// A cursor into an append-only span log.
#[derive(Debug)]
pub struct TelemetryTail {
    path: PathBuf,
    offset: u64,
}

impl TelemetryTail {
    /// Points a cursor at `path`. The file need not exist yet.
    #[must_use]
    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self {
            path: path.into(),
            offset: 0,
        }
    }

    /// Path this cursor reads.
    #[must_use]
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Bytes consumed so far, which is where the next poll resumes.
    #[must_use]
    pub fn offset(&self) -> u64 {
        self.offset
    }

    /// Reads every span appended since the previous call.
    ///
    /// A missing file is an empty read rather than an error: the recorder has not written its first span
    /// yet, and a viewer started before any run should show nothing rather than a failure.
    pub fn poll(&mut self) -> std::io::Result<Vec<TelemetrySpan>> {
        let mut file = match std::fs::File::open(&self.path) {
            Ok(file) => file,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
            Err(error) => return Err(error),
        };

        let length = file.metadata()?.len();
        if length < self.offset {
            // Rotated or recreated: resume from the start rather than reading garbage at a stale offset.
            self.offset = 0;
        }
        file.seek(SeekFrom::Start(self.offset))?;

        let mut chunk = Vec::new();
        file.read_to_end(&mut chunk)?;

        // Only complete lines count. Whatever follows the last newline stays for the next poll.
        let Some(last_newline) = chunk.iter().rposition(|byte| *byte == b'\n') else {
            return Ok(Vec::new());
        };
        let consumed = last_newline + 1;
        let complete = &chunk[..consumed];
        self.offset += consumed as u64;

        Ok(complete
            .split(|byte| *byte == b'\n')
            .filter(|line| !line.is_empty())
            .filter_map(|line| serde_json::from_slice::<TelemetrySpan>(line).ok())
            .collect())
    }
}

#[cfg(test)]
mod tests {
    // AGENTS.md law 5 allows these in tests; the workspace lint denies them for production paths and
    // clippy applies that to this target as a whole, so the allowance has to be stated here.
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::*;
    use gaugeblock_contracts::SpanStatus;
    use std::io::Write;
    use uuid::Uuid;

    fn span(binary: &str) -> TelemetrySpan {
        let mut span = TelemetrySpan::open(Uuid::new_v4(), binary, Uuid::new_v4(), 1_000);
        span.status = SpanStatus::Ok;
        span
    }

    fn line(span: &TelemetrySpan) -> String {
        format!("{}\n", serde_json::to_string(span).unwrap())
    }

    fn log_with(contents: &str) -> (tempfile::TempDir, PathBuf) {
        let dir = tempfile::TempDir::new().unwrap();
        let path = dir.path().join("events.jsonl");
        std::fs::write(&path, contents).unwrap();
        (dir, path)
    }

    #[test]
    fn a_missing_log_reads_as_empty() {
        let mut tail = TelemetryTail::new("/nonexistent/telemetry/events.jsonl");

        assert!(
            tail.poll().unwrap().is_empty(),
            "not yet written is not an error"
        );
    }

    #[test]
    fn polling_twice_returns_only_what_is_new() {
        let (dir, path) = log_with(&line(&span("miter")));
        let mut tail = TelemetryTail::new(&path);

        assert_eq!(tail.poll().unwrap().len(), 1);
        assert!(tail.poll().unwrap().is_empty(), "the cursor advanced");

        let mut file = std::fs::OpenOptions::new()
            .append(true)
            .open(&path)
            .unwrap();
        write!(file, "{}", line(&span("outfeed"))).unwrap();

        let new = tail.poll().unwrap();
        assert_eq!(new.len(), 1);
        assert_eq!(new[0].binary, "outfeed");
        drop(dir);
    }

    #[test]
    fn a_line_still_being_written_is_left_alone_until_it_completes() {
        // The reason this is not `read_to_string().lines()`: a writer mid-append must not look like
        // corruption, and must not be lost once the rest of the line arrives.
        let (dir, path) = log_with(&line(&span("miter")));
        let mut tail = TelemetryTail::new(&path);
        assert_eq!(tail.poll().unwrap().len(), 1);

        let mut file = std::fs::OpenOptions::new()
            .append(true)
            .open(&path)
            .unwrap();
        let full = line(&span("sawhorse"));
        let (head, remainder) = full.split_at(full.len() / 2);
        write!(file, "{head}").unwrap();

        assert!(
            tail.poll().unwrap().is_empty(),
            "no newline means no complete span"
        );

        write!(file, "{remainder}").unwrap();
        let completed = tail.poll().unwrap();
        assert_eq!(
            completed.len(),
            1,
            "the completed line is read exactly once"
        );
        assert_eq!(completed[0].binary, "sawhorse");
        drop(dir);
    }

    #[test]
    fn one_unparseable_line_does_not_hide_the_ones_after_it() {
        let (dir, path) = log_with(&format!(
            "{{\"from_an_older_schema\":true}}\n{}",
            line(&span("outfeed"))
        ));
        let mut tail = TelemetryTail::new(&path);

        let spans = tail.poll().unwrap();
        assert_eq!(spans.len(), 1);
        assert_eq!(spans[0].binary, "outfeed");
        drop(dir);
    }

    #[test]
    fn a_truncated_log_restarts_at_the_beginning() {
        // Two lines, then one: the file genuinely shrinks below the cursor, which is what rotation and
        // `> events.jsonl` both look like. Overwriting one line with a *longer* one would not test this.
        let (dir, path) = log_with(&format!(
            "{}{}",
            line(&span("miter")),
            line(&span("outfeed"))
        ));
        let mut tail = TelemetryTail::new(&path);
        assert_eq!(tail.poll().unwrap().len(), 2);

        std::fs::write(&path, line(&span("benchwork"))).unwrap();
        let spans = tail.poll().unwrap();

        assert_eq!(spans.len(), 1, "rotation is not a reason to stop reading");
        assert_eq!(spans[0].binary, "benchwork");
        drop(dir);
    }
}
