//! Law 12 latency rollups over completed spans (`GB-243` AC6).
//!
//! Pure by construction: spans in, numbers out, no benchwork types and no database handle. That is what
//! keeps the promotion criterion on `GB-243` cheap - the moment a second consumer wants these figures
//! they move into a shared crate as a two-file change rather than a redesign.
//!
//! **Only completed spans count.** A span with no `duration_ms` is still running, and folding those in
//! as zero would drag every percentile low - wrong in the direction that reads as good news, which is the
//! worst kind of wrong for a performance table.
//!
//! The percentile method is **nearest-rank**, stated so two implementations cannot quietly disagree:
//! sort ascending, take the value at `ceil(q * n)` (one-based), clamping to the last element. No
//! interpolation - a reported P95 is always a duration that actually happened.

/// Latency figures for one group of spans.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LatencyStats {
    /// How many completed spans the figures were computed from.
    pub count: usize,
    /// Median duration, in milliseconds.
    pub p50_ms: u64,
    /// 95th percentile duration, in milliseconds.
    pub p95_ms: u64,
}

/// One completed span, reduced to what the rollups need.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CompletedSpan {
    /// The tool that emitted the span, e.g. `sawhorse`.
    pub binary: String,
    /// The operation within that tool, when it recorded one.
    pub command: Option<String>,
    /// How long it ran, in milliseconds.
    pub duration_ms: u64,
}

impl CompletedSpan {
    /// The `binary`/`command` label a table groups by.
    #[must_use]
    pub fn group_label(&self) -> String {
        match &self.command {
            Some(command) => format!("{} · {command}", self.binary),
            None => self.binary.clone(),
        }
    }
}

/// Computes nearest-rank percentiles over one group, or `None` when nothing completed.
#[must_use]
pub fn latency_stats(durations: &[u64]) -> Option<LatencyStats> {
    if durations.is_empty() {
        return None;
    }
    let mut sorted = durations.to_vec();
    sorted.sort_unstable();

    Some(LatencyStats {
        count: sorted.len(),
        p50_ms: nearest_rank(&sorted, 50),
        p95_ms: nearest_rank(&sorted, 95),
    })
}

/// Value at rank `ceil(q/100 * n)`, one-based, clamped to the last element.
fn nearest_rank(sorted: &[u64], percentile: usize) -> u64 {
    let n = sorted.len();
    // Ceiling division without floats: (percentile * n + 99) / 100.
    let rank = ((percentile * n).div_ceil(100)).clamp(1, n);
    // INVARIANT: rank is clamped into 1..=n and sorted is non-empty, so this index is always in range.
    sorted[rank - 1]
}

/// Groups completed spans by `binary`/`command` and returns their figures, slowest P95 first.
///
/// Ordering by P95 rather than by name puts whatever is actually hurting at the top of the table, which
/// is the only reason to open it.
#[must_use]
pub fn rollup_by_group(spans: &[CompletedSpan]) -> Vec<(String, LatencyStats)> {
    let mut groups: std::collections::BTreeMap<String, Vec<u64>> =
        std::collections::BTreeMap::new();
    for span in spans {
        groups
            .entry(span.group_label())
            .or_default()
            .push(span.duration_ms);
    }

    let mut rollup: Vec<(String, LatencyStats)> = groups
        .into_iter()
        .filter_map(|(label, durations)| latency_stats(&durations).map(|stats| (label, stats)))
        .collect();
    rollup.sort_by(|a, b| b.1.p95_ms.cmp(&a.1.p95_ms).then_with(|| a.0.cmp(&b.0)));
    rollup
}

#[cfg(test)]
mod tests {
    #![allow(clippy::unwrap_used, clippy::expect_used)]

    use super::*;

    #[test]
    fn nearest_rank_returns_a_value_that_actually_happened() {
        // 1..=100: P50 is the 50th value, P95 the 95th. No interpolation, so both are real samples.
        let durations: Vec<u64> = (1..=100).collect();
        let stats = latency_stats(&durations).unwrap();

        assert_eq!(stats.count, 100);
        assert_eq!(stats.p50_ms, 50);
        assert_eq!(stats.p95_ms, 95);
    }

    #[test]
    fn unsorted_input_is_sorted_rather_than_trusted() {
        let stats = latency_stats(&[900, 10, 500, 20, 30]).unwrap();

        assert_eq!(stats.p50_ms, 30, "third of five, ascending");
        assert_eq!(stats.p95_ms, 900, "rank clamps to the last element");
    }

    #[test]
    fn one_span_reports_itself_as_every_percentile() {
        let stats = latency_stats(&[42]).unwrap();

        assert_eq!((stats.count, stats.p50_ms, stats.p95_ms), (1, 42, 42));
    }

    #[test]
    fn nothing_completed_reports_nothing_rather_than_zero() {
        // Zero would be a claim: "this ran in 0 ms". None says the run has not finished.
        assert_eq!(latency_stats(&[]), None);
    }

    #[test]
    fn the_table_is_ordered_by_p95_so_the_worst_is_first() {
        let spans = vec![
            CompletedSpan {
                binary: "miter".to_string(),
                command: Some("deps".to_string()),
                duration_ms: 5,
            },
            CompletedSpan {
                binary: "sawhorse".to_string(),
                command: Some("complete".to_string()),
                duration_ms: 4_000,
            },
        ];

        let rollup = rollup_by_group(&spans);

        assert_eq!(rollup[0].0, "sawhorse · complete");
        assert_eq!(rollup[0].1.p50_ms, 4_000);
        assert_eq!(rollup[1].0, "miter · deps");
    }
}
