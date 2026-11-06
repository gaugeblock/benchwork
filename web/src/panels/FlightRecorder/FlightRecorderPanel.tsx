// Flight Recorder panel (GB-243 AC5): a live waterfall over the newest trace.
//
// Bars are positioned against the trace's own earliest span rather than a global clock, because a trace
// is one unit of work and a shared origin is what makes overlapping spans legible. Widths are durations,
// so a bar that is wide is slow and there is nothing to interpret.

import { useMemo, useState } from 'react';
import { Activity, Eraser } from 'lucide-react';

import { groupByTrace, useTelemetryStream } from '../../api/useTelemetryStream';
import type { TelemetrySpan } from '../../api/useTelemetryStream';

const STATUS_COLOUR: Record<TelemetrySpan['status'], string> = {
  ok: 'bg-cad-cyan/70',
  error: 'bg-red-500/70',
  running: 'bg-cad-muted/50',
};

function label(span: TelemetrySpan): string {
  return span.command ? `${span.binary} · ${span.command}` : span.binary;
}

export const FlightRecorderPanel: React.FC = () => {
  const { connected, spans, clear } = useTelemetryStream();
  const [traceIndex, setTraceIndex] = useState(0);

  const traces = useMemo(() => groupByTrace(spans), [spans]);
  const selected = traces[traceIndex] ?? traces[0];
  const traceSpans = selected?.[1] ?? [];

  const window = useMemo(() => {
    if (traceSpans.length === 0) return { start: 0, span: 1 };
    const start = Math.min(...traceSpans.map((s) => s.started_at_ms));
    const end = Math.max(
      ...traceSpans.map((s) => s.started_at_ms + (s.duration_ms ?? 0))
    );
    // A single instant trace would divide by zero; one millisecond keeps the bar visible.
    return { start, span: Math.max(end - start, 1) };
  }, [traceSpans]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cad-bg">
      {/* Header pulse: what the recorder is doing right now, without asking for it. */}
      <div className="h-10 shrink-0 border-b border-cad-border bg-cad-subsurface/40 flex items-center gap-3 px-4">
        <Activity className="w-3.5 h-3.5 text-cad-cyan" />
        <span className="text-xs font-semibold text-cad-text">Flight Recorder</span>
        <span
          className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-cad-cyan' : 'bg-cad-muted'}`}
          title={connected ? 'streaming' : 'reconnecting'}
        />
        <span className="text-[11px] text-cad-muted">
          {spans.length} spans · {traces.length} traces
        </span>
        <div className="flex-1" />
        {traces.length > 1 && (
          <select
            className="text-[11px] bg-cad-surface border border-cad-border rounded px-1.5 py-0.5 text-cad-text"
            value={traceIndex}
            onChange={(event) => setTraceIndex(Number(event.target.value))}
          >
            {traces.map(([traceId], index) => (
              <option key={traceId} value={index}>
                trace {traceId.slice(0, 8)}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={clear}
          className="flex items-center gap-1 text-[11px] text-cad-muted hover:text-cad-text"
          title="clear the view; the log on disk is untouched"
        >
          <Eraser className="w-3 h-3" />
          Clear
        </button>
      </div>

      {traceSpans.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-cad-muted px-6 text-center">
          No spans yet. Run any suite command - a gate step, an inference call - and its spans appear
          here as they are appended to .gaugeblock/telemetry/events.jsonl.
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-4 py-3 space-y-1">
          {traceSpans.map((span) => {
            const offset = ((span.started_at_ms - window.start) / window.span) * 100;
            const width = Math.max(((span.duration_ms ?? 0) / window.span) * 100, 0.4);
            return (
              <div key={span.span_id} className="flex items-center gap-3 group">
                <div className="w-56 shrink-0 truncate text-[11px] text-cad-text" title={label(span)}>
                  {label(span)}
                </div>
                <div className="flex-1 relative h-4 bg-cad-surface/40 rounded-sm">
                  <div
                    className={`absolute top-0 h-4 rounded-sm ${STATUS_COLOUR[span.status]}`}
                    style={{ left: `${offset}%`, width: `${width}%` }}
                    title={span.first_diagnostic ?? `${span.duration_ms ?? 0} ms`}
                  />
                </div>
                <div className="w-16 shrink-0 text-right text-[11px] tabular-nums text-cad-muted">
                  {span.duration_ms ?? '—'} ms
                </div>
              </div>
            );
          })}
          {traceSpans.some((span) => span.status === 'error') && (
            <div className="pt-2 text-[11px] text-red-400">
              {traceSpans.find((span) => span.first_diagnostic)?.first_diagnostic}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
