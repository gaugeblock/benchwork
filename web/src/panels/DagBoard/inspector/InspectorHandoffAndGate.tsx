import React from 'react';
import type { VerificationReceipt, HandoffPacket } from '../../../types';
import {
  Terminal,
  ShieldCheck,
  Clock,
  CheckCircle,
  Circle,
  AlertOctagon,
  GitCommit,
  FileWarning,
} from 'lucide-react';

interface InspectorHandoffAndGateProps {
  verificationCommand?: string;
  verificationReceipt?: VerificationReceipt;
  latestHandoff?: HandoffPacket;
  deferredIssues?: [string, string][];
}

export const InspectorHandoffAndGate: React.FC<InspectorHandoffAndGateProps> = ({
  verificationCommand,
  verificationReceipt,
  latestHandoff,
  deferredIssues = [],
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Verification Gate */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
          Verification Gate
        </span>
        <div className="p-2 rounded bg-cad-bg border border-cad-border flex items-center gap-2 font-mono text-[11px] text-cad-cyan">
          <Terminal className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{verificationCommand || 'cargo test'}</span>
        </div>

        {verificationReceipt && (
          <div className="mt-1 p-2.5 rounded border border-cad-emerald/40 bg-cad-emerald/10 flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between text-cad-emerald font-semibold">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified by {verificationReceipt.verifier}</span>
              </div>
              {verificationReceipt.exit_code !== undefined && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cad-bg border border-cad-emerald/40">
                  exit {verificationReceipt.exit_code}
                </span>
              )}
            </div>
            <span className="text-cad-text text-[10px] leading-relaxed">
              {verificationReceipt.summary}
            </span>
          </div>
        )}
      </div>

      {/* Latest Agent Handoff Packet */}
      {latestHandoff && (
        <div className="flex flex-col gap-2 p-3 rounded bg-cad-bg border border-cad-border">
          <div className="flex items-center justify-between text-[10px] font-bold text-cad-muted">
            <span className="flex items-center gap-1 text-cad-cyan">
              <Clock className="w-3 h-3" /> Agent Handoff Packet
            </span>
            <span className="font-mono">{latestHandoff.recorded_by_agent}</span>
          </div>

          {latestHandoff.last_error_or_blocker && (
            <div className="p-2 rounded bg-cad-amber/10 border border-cad-amber/40 flex items-start gap-1.5 text-[10px] text-cad-amber">
              <AlertOctagon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{latestHandoff.last_error_or_blocker}</span>
            </div>
          )}

          {latestHandoff.completed_items.length > 0 && (
            <div className="flex flex-col gap-1 text-[11px]">
              <span className="text-[10px] text-cad-muted font-semibold">Completed:</span>
              {latestHandoff.completed_items.map((it, i) => (
                <span key={i} className="flex items-center gap-1.5 text-cad-emerald text-[10px]">
                  <CheckCircle className="w-3 h-3 shrink-0" /> {it}
                </span>
              ))}
            </div>
          )}

          {latestHandoff.remaining_items.length > 0 && (
            <div className="flex flex-col gap-1 text-[11px] pt-1">
              <span className="text-[10px] text-cad-muted font-semibold">Remaining:</span>
              {latestHandoff.remaining_items.map((it, i) => (
                <span key={i} className="flex items-center gap-1.5 text-cad-muted text-[10px]">
                  <Circle className="w-3 h-3 shrink-0" /> {it}
                </span>
              ))}
            </div>
          )}

          {latestHandoff.git_ref && (
            <div className="flex items-center gap-1 text-[10px] text-cad-muted font-mono pt-1 border-t border-cad-border/50">
              <GitCommit className="w-3 h-3 text-cad-cyan" /> {latestHandoff.git_ref}
            </div>
          )}
        </div>
      )}

      {/* Deferred Issues in Scope */}
      {deferredIssues.length > 0 && (
        <div className="flex flex-col gap-1.5 p-3 rounded bg-cad-bg border border-purple-500/30">
          <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider flex items-center gap-1">
            <FileWarning className="w-3 h-3" /> Deferred Issues in Scope ({deferredIssues.length})
          </span>
          <div className="flex flex-col gap-1">
            {deferredIssues.map(([id, title]) => (
              <div key={id} className="text-[10px] flex items-center gap-1.5 text-cad-text">
                <span className="font-mono text-purple-400 shrink-0">{id}</span>
                <span className="truncate text-cad-muted">{title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
