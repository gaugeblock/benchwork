// React hook for /api/v1/telemetry/stream (GB-243 AC5).
//
// Separate from useLiveStream because the channel is different in kind: those events are produced by
// the daemon, while spans are produced by every other process in the suite and arrive through a file.
// The server sends one named `span` event per record, so this listens for that event name rather than
// onmessage - an unnamed handler would silently receive nothing.

import { useEffect, useRef, useState } from 'react';

/** One flight-recorder span, mirroring `gaugeblock_contracts::TelemetrySpan`. */
export interface TelemetrySpan {
  span_id: string;
  trace_id: string;
  parent_span_id?: string | null;
  binary: string;
  command?: string | null;
  task_key?: string | null;
  branch?: string | null;
  status: 'running' | 'ok' | 'error';
  started_at_ms: number;
  duration_ms?: number | null;
  first_diagnostic?: string | null;
  worktree_diff_hash?: string | null;
}

/** Keeps memory bounded: a long gate run can emit thousands of spans. */
const MAX_SPANS = 500;

export function useTelemetryStream() {
  const [connected, setConnected] = useState(false);
  const [spans, setSpans] = useState<TelemetrySpan[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      source = new EventSource('/api/v1/telemetry/stream');

      source.onopen = () => setConnected(true);

      source.addEventListener('span', (event) => {
        try {
          const span: TelemetrySpan = JSON.parse((event as MessageEvent).data);
          if (!mounted.current) return;
          setSpans((previous) => {
            const next = [...previous, span];
            return next.length > MAX_SPANS ? next.slice(next.length - MAX_SPANS) : next;
          });
        } catch (error) {
          console.error('Failed parsing telemetry span:', error);
        }
      });

      source.onerror = () => {
        setConnected(false);
        source?.close();
        if (mounted.current) retry = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      mounted.current = false;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, []);

  return { connected, spans, clear: () => setSpans([]) };
}

/**
 * Groups spans into traces, newest trace first.
 *
 * A trace's own ordering is preserved: the server sends spans as they are appended and the index
 * returns them oldest-first, so no client-side sort is needed - and sorting here would fight the
 * real clock, which is the only clock that matters for a waterfall.
 */
export function groupByTrace(spans: TelemetrySpan[]): Array<[string, TelemetrySpan[]]> {
  const traces = new Map<string, TelemetrySpan[]>();
  for (const span of spans) {
    const existing = traces.get(span.trace_id);
    if (existing) existing.push(span);
    else traces.set(span.trace_id, [span]);
  }
  return Array.from(traces.entries()).sort((a, b) => {
    const latest = (list: TelemetrySpan[]) => Math.max(...list.map((s) => s.started_at_ms));
    return latest(b[1]) - latest(a[1]);
  });
}
