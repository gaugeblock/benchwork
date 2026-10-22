import React, { useState } from 'react';
import type { AnonymizedSynthesisTrace } from '../../types';
import { api } from '../../api/client';
import { Trash2, AlertCircle, FileCode } from 'lucide-react';

interface SpoolTraceTableProps {
  traces: AnonymizedSynthesisTrace[];
  onRefresh: () => void;
}

const TIER_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  bronze: { bg: 'bg-amber-950/40', text: 'text-amber-500', border: 'border-amber-600/40' },
  silver: { bg: 'bg-slate-800/60', text: 'text-slate-300', border: 'border-slate-500/40' },
  gold: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', border: 'border-yellow-500/40' },
  diamond: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/40' },
};

export const SpoolTraceTable: React.FC<SpoolTraceTableProps> = ({ traces, onRefresh }) => {
  const [selectedTrace, setSelectedTrace] = useState<AnonymizedSynthesisTrace | null>(
    traces[0] || null
  );
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (traceId: string) => {
    if (!confirm(`Purge telemetry trace ${traceId}?`)) return;
    setDeleting(true);
    try {
      await api.deleteSpoolTrace(traceId);
      if (selectedTrace?.trace_id === traceId) {
        setSelectedTrace(null);
      }
      onRefresh();
    } catch (err) {
      alert(`Failed to delete trace: ${err}`);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = traces.filter(
    (t) => tierFilter === 'all' || t.tier.toLowerCase() === tierFilter
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-cad-bg">
      {/* Trace Table */}
      <div className="flex-1 flex flex-col border-r border-cad-border overflow-hidden">
        <div className="p-2.5 border-b border-cad-border bg-cad-surface flex items-center justify-between">
          <span className="text-xs font-bold text-cad-text uppercase">
            Rabbet Telemetry Outbox ({traces.length})
          </span>

          <div className="flex items-center gap-1 text-[11px]">
            {['all', 'bronze', 'silver', 'gold', 'diamond'].map((tier) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`px-2 py-0.5 rounded capitalize ${
                  tierFilter === tier
                    ? 'bg-cad-cyan/20 text-cad-cyan font-bold'
                    : 'text-cad-muted hover:text-cad-text'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-cad-muted">
              Zero telemetry traces in spool outbox.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-cad-subsurface/60 text-[10px] text-cad-muted border-b border-cad-border uppercase">
                <tr>
                  <th className="py-2 px-3">Trace ID</th>
                  <th className="py-2 px-2">Tier</th>
                  <th className="py-2 px-2">Lang</th>
                  <th className="py-2 px-2">Pattern</th>
                  <th className="py-2 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cad-border/50">
                {filtered.map((trace) => {
                  const isSelected = selectedTrace?.trace_id === trace.trace_id;
                  const badge = TIER_BADGES[trace.tier.toLowerCase()] || TIER_BADGES.bronze;
                  return (
                    <tr
                      key={trace.trace_id}
                      onClick={() => setSelectedTrace(trace)}
                      className={`cursor-pointer hover:bg-cad-surface/80 transition-colors ${
                        isSelected ? 'bg-cad-cyan/10' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-cad-text font-bold">
                        {trace.trace_id.slice(0, 8)}...
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border capitalize ${badge.bg} ${badge.text} ${badge.border}`}>
                          {trace.tier}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-cad-muted">{trace.language}</td>
                      <td className="py-2 px-2 text-cad-muted truncate max-w-[120px]">
                        {trace.selected_pattern_id || 'Oracle'}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          disabled={deleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(trace.trace_id);
                          }}
                          className="p-1 hover:text-cad-crimson text-cad-muted transition-colors"
                          title="Purge trace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Trace Inspector Detail */}
      <div className="w-full md:w-[460px] flex flex-col bg-cad-surface/30 overflow-hidden">
        <div className="p-3 border-b border-cad-border bg-cad-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cad-cyan" />
            <span className="text-xs font-bold text-cad-text uppercase">
              Trace Deep Inspection
            </span>
          </div>
          {selectedTrace && (
            <span className="text-[10px] font-mono text-cad-muted">
              {selectedTrace.trace_id}
            </span>
          )}
        </div>

        {selectedTrace ? (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-xs">
            {/* Scope Signature */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold text-cad-muted">
                Anonymized Scope Signature:
              </span>
              <pre className="p-2.5 rounded bg-cad-bg border border-cad-border text-[11px] text-cad-text whitespace-pre-wrap leading-relaxed">
                {selectedTrace.anonymized_scope_signature}
              </pre>
            </div>

            {/* Filled Holes */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-cad-muted">
                Filled Holes Substitution:
              </span>
              {selectedTrace.filled_holes.map(([hole, expr], idx) => (
                <div key={idx} className="p-2 rounded bg-cad-bg border border-cad-border flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-cad-cyan">?[{hole}]:</span>
                  <span className="text-[11px] text-cad-text">{expr}</span>
                </div>
              ))}
            </div>

            {/* Gold DPO Rejected Pair */}
            {selectedTrace.rejected_attempt && (
              <div className="flex flex-col gap-1 p-3 rounded border border-yellow-500/30 bg-yellow-500/10">
                <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-[11px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Gold DPO Training Pair (Rejected Attempt)</span>
                </div>
                <pre className="p-2 rounded bg-cad-bg/80 border border-cad-border text-[11px] text-cad-muted whitespace-pre-wrap">
                  {selectedTrace.rejected_attempt}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-cad-muted">
            Select a trace from the table to view anonymized AST substitutions and DPO pairs.
          </div>
        )}
      </div>
    </div>
  );
};
