import React, { useState } from 'react';
import type { VerificationReceipt, HandoffPacket, AgentClaim } from '../../../types';
import {
  Terminal,
  ShieldCheck,
  Clock,
  CheckCircle,
  Circle,
  AlertOctagon,
  GitCommit,
  GitBranch,
  FileWarning,
  Copy,
  Check,
} from 'lucide-react';

interface InspectorHandoffAndGateProps {
  verificationCommand?: string;
  verificationReceipt?: VerificationReceipt;
  activeClaim?: AgentClaim;
  latestHandoff?: HandoffPacket;
  deferredIssues?: [string, string][];
}

export const InspectorHandoffAndGate: React.FC<InspectorHandoffAndGateProps> = ({
  verificationCommand,
  verificationReceipt,
  activeClaim,
  latestHandoff,
  deferredIssues = [],
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const getVerifierBadgeClass = (verifier: string) => {
    const v = verifier.toLowerCase();
    if (v.includes('miter')) {
      return 'border-cad-cyan/40 bg-cad-cyan/10 text-cad-cyan';
    }
    if (v.includes('manual')) {
      return 'border-cad-amber/40 bg-cad-amber/10 text-cad-amber';
    }
    return 'border-cad-emerald/40 bg-cad-emerald/10 text-cad-emerald';
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Active Agent Claim & Branch */}
      {activeClaim && (
        <div className="flex flex-col gap-1.5 p-3 rounded bg-cad-bg border border-purple-500/40">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="flex items-center gap-1 text-purple-400">
              <Clock className="w-3 h-3" /> Active Claim
            </span>
            <span className="font-mono text-purple-300">{activeClaim.agent_id}</span>
          </div>

          {activeClaim.git_branch && (
            <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-cad-border/50">
              <span className="flex items-center gap-1 text-cad-muted">
                <GitBranch className="w-3 h-3 text-purple-400" />
                <span className="font-mono font-medium text-cad-text">{activeClaim.git_branch}</span>
              </span>
              <button
                onClick={() => copyToClipboard(`git checkout ${activeClaim.git_branch}`)}
                className="flex items-center gap-0.5 text-[9px] text-cad-muted hover:text-cad-text px-1 py-0.5 rounded bg-cad-surface border border-cad-border"
                title="Copy git checkout command"
              >
                {copiedText === `git checkout ${activeClaim.git_branch}` ? (
                  <Check className="w-2.5 h-2.5 text-cad-emerald" />
                ) : (
                  <Copy className="w-2.5 h-2.5" />
                )}
                <span>checkout</span>
              </button>
            </div>
          )}

          {activeClaim.base_commit_sha && (
            <div className="flex items-center gap-1 text-[10px] text-cad-muted font-mono">
              <GitCommit className="w-3 h-3 text-cad-muted" /> Base: {activeClaim.base_commit_sha.slice(0, 7)}
            </div>
          )}
        </div>
      )}

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
          <div className="mt-1 p-2.5 rounded border border-cad-border bg-cad-surface flex flex-col gap-2 text-[11px]">
            <div className="flex items-center justify-between font-semibold">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono ${getVerifierBadgeClass(verificationReceipt.verifier)}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{verificationReceipt.verifier}</span>
              </div>
              {verificationReceipt.exit_code !== undefined && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cad-bg border border-cad-border text-cad-muted">
                  exit {verificationReceipt.exit_code}
                </span>
              )}
            </div>

            {/* Branch and Commits Lineage */}
            {(verificationReceipt.git_branch || verificationReceipt.commit_shas?.length || verificationReceipt.head_commit_sha) && (
              <div className="flex flex-col gap-1.5 pt-1 border-t border-cad-border/50 text-[10px]">
                {verificationReceipt.git_branch && (
                  <div className="flex items-center justify-between text-cad-muted">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-cad-cyan" />
                      <span className="font-mono text-cad-text">{verificationReceipt.git_branch}</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(verificationReceipt.git_branch || '')}
                      className="text-cad-muted hover:text-cad-text"
                      title="Copy branch"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

                {verificationReceipt.commit_shas && verificationReceipt.commit_shas.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-cad-muted">
                      Atomic Commits ({verificationReceipt.commit_shas.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {verificationReceipt.commit_shas.map((sha) => (
                        <span
                          key={sha}
                          onClick={() => copyToClipboard(sha)}
                          className="flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-cad-bg border border-cad-border font-mono text-[9px] text-cad-cyan hover:border-cad-cyan cursor-pointer"
                          title={`Click to copy full commit hash (${sha})`}
                        >
                          <GitCommit className="w-2.5 h-2.5" />
                          {sha.slice(0, 7)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <span className="text-cad-text text-[10px] leading-relaxed pt-1 border-t border-cad-border/30">
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
