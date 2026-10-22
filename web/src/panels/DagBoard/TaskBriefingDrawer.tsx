import React, { useEffect, useState } from 'react';
import type { TaskContextBriefing } from '../../types';
import { api } from '../../api/client';
import { X, CheckCircle, AlertTriangle, Terminal, ShieldCheck, Clock } from 'lucide-react';

interface TaskBriefingDrawerProps {
  taskId: string;
  onClose: () => void;
}

export const TaskBriefingDrawer: React.FC<TaskBriefingDrawerProps> = ({ taskId, onClose }) => {
  const [briefing, setBriefing] = useState<TaskContextBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getTaskBriefing(taskId)
      .then((data) => {
        if (mounted) setBriefing(data);
      })
      .catch((err) => console.error('Failed loading briefing:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [taskId]);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[420px] bg-cad-surface border-l border-cad-border shadow-2xl flex flex-col z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cad-border bg-cad-subsurface/60">
        <div>
          <span className="text-xs font-bold text-cad-cyan">{briefing?.task.ticket_key}</span>
          <h2 className="text-sm font-semibold text-cad-text leading-tight">
            {briefing?.task.title || 'Task Details'}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-cad-surface rounded text-cad-muted hover:text-cad-text transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-cad-muted animate-pulse">
          Loading Task Context Briefing...
        </div>
      ) : briefing ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
          {/* Scope Coordinates */}
          <div className="flex flex-col gap-1.5 p-3 rounded bg-cad-bg border border-cad-border">
            <span className="text-[10px] uppercase font-bold text-cad-muted">Scope Coordinates</span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-cad-muted">Repo: </span>
                <span className="text-cad-text">{briefing.task.scope.repo || 'root'}</span>
              </div>
              <div>
                <span className="text-cad-muted">Crate: </span>
                <span className="text-cad-cyan">{briefing.task.scope.crate_name || 'n/a'}</span>
              </div>
            </div>
          </div>

          {/* Collision Warnings Alert */}
          {briefing.file_collision_warnings.length > 0 && (
            <div className="p-3 border border-cad-amber/40 bg-cad-amber/10 rounded flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-cad-amber font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Scope Collision Warning</span>
              </div>
              {briefing.file_collision_warnings.map((warn, i) => (
                <span key={i} className="text-[10px] text-cad-muted">{warn}</span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-cad-muted">Description</span>
            <p className="text-cad-text leading-relaxed bg-cad-bg/50 p-2.5 rounded border border-cad-border/60">
              {briefing.task.description || 'No description provided.'}
            </p>
          </div>

          {/* Verification Command & Receipt */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-cad-muted">Verification Gate</span>
            <div className="p-2 rounded bg-cad-bg border border-cad-border flex items-center gap-2 font-mono text-[11px] text-cad-cyan">
              <Terminal className="w-3.5 h-3.5 shrink-0" />
              <span>{briefing.verification_command || 'cargo test'}</span>
            </div>

            {briefing.task.verification_receipt && (
              <div className="mt-1.5 p-2.5 rounded border border-cad-emerald/40 bg-cad-emerald/10 flex flex-col gap-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-cad-emerald font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified by {briefing.task.verification_receipt.verifier}</span>
                </div>
                <span className="text-cad-text text-[10px]">
                  {briefing.task.verification_receipt.summary}
                </span>
              </div>
            )}
          </div>

          {/* Latest Agent Handoff Packet */}
          {briefing.task.latest_handoff && (
            <div className="flex flex-col gap-1.5 p-3 rounded bg-cad-bg border border-cad-border">
              <div className="flex items-center justify-between text-[10px] font-bold text-cad-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cad-cyan" />
                  Agent Handoff Packet
                </span>
                <span>By {briefing.task.latest_handoff.recorded_by_agent}</span>
              </div>
              <div className="flex flex-col gap-1 text-[11px]">
                <span className="text-cad-muted">Completed Items:</span>
                {briefing.task.latest_handoff.completed_items.map((it, i) => (
                  <span key={i} className="flex items-center gap-1.5 text-cad-emerald">
                    <CheckCircle className="w-3 h-3" /> {it}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
