import React, { useRef, useEffect } from 'react';
import { Bot, User, Loader2, Sparkles } from 'lucide-react';
import type { BenchworkMessage } from '../../chat/useBenchworkChat';
import { PlanProposalToolUi } from '../../chat/tools/PlanProposalToolUi';
import { DocPatchToolUi } from '../../chat/tools/DocPatchToolUi';
import { DecisionToolUi } from '../../chat/tools/DecisionToolUi';

interface BenjiMessagesProps {
  messages: BenchworkMessage[];
  isRunning: boolean;
  onApplyProposal: (
    proposalId: string,
    toolName: string,
    payloadJson: string,
    approved: boolean,
    editedPayload?: string
  ) => void;
}

export const BenjiMessages: React.FC<BenjiMessagesProps> = ({
  messages,
  isRunning,
  onApplyProposal,
}) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isRunning]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-xs select-text">
      {messages.length === 0 && (
        <div className="py-12 px-4 text-center text-cad-muted flex flex-col items-center justify-center gap-2">
          <div className="w-8 h-8 rounded-full bg-cad-cyan/10 border border-cad-cyan/30 flex items-center justify-center text-cad-cyan mb-1">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-semibold text-cad-text">Benji — AI Systems Engineering Partner</span>
          <p className="text-[11px] max-w-xs text-cad-muted leading-relaxed">
            Directly grounded in the 9-Document Topology, AST indexer, and Storypole backlog.
            Type <code className="text-cad-cyan">/plan</code>, <code className="text-cad-cyan">@doc:</code>, or <code className="text-cad-cyan">@task:</code> to begin.
          </p>
        </div>
      )}

      {messages.map((m) => {
        const isUser = m.role === 'user';
        return (
          <div
            key={m.id}
            className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-cad-muted px-1">
              {isUser ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-cad-muted" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-cad-cyan" />
                  <span className="text-cad-cyan font-bold">Benji</span>
                </>
              )}
            </div>

            <div
              className={`max-w-[92%] rounded p-2.5 leading-relaxed whitespace-pre-wrap break-words ${
                isUser
                  ? 'bg-cad-cyan/10 text-cad-text border border-cad-cyan/30'
                  : 'bg-cad-subsurface text-cad-text border border-cad-border'
              }`}
            >
              {m.content}
            </div>

            {/* Staged Proposal Card */}
            {m.proposal && (
              <div className="w-full mt-2">
                {m.proposal.toolName === 'propose_task_plan' && (
                  <PlanProposalToolUi
                    proposalId={m.proposal.proposalId}
                    payloadJson={m.proposal.payloadJson}
                    onApprove={() =>
                      onApplyProposal(m.proposal!.proposalId, m.proposal!.toolName, m.proposal!.payloadJson, true)
                    }
                    onReject={() =>
                      onApplyProposal(m.proposal!.proposalId, m.proposal!.toolName, m.proposal!.payloadJson, false)
                    }
                  />
                )}
                {m.proposal.toolName === 'propose_doc_patch' && (
                  <DocPatchToolUi
                    proposalId={m.proposal.proposalId}
                    payloadJson={m.proposal.payloadJson}
                    onApprove={() =>
                      onApplyProposal(m.proposal!.proposalId, m.proposal!.toolName, m.proposal!.payloadJson, true)
                    }
                    onReject={() =>
                      onApplyProposal(m.proposal!.proposalId, m.proposal!.toolName, m.proposal!.payloadJson, false)
                    }
                  />
                )}
                {m.proposal.toolName === 'resolve_decision' && (
                  <DecisionToolUi
                    proposalId={m.proposal.proposalId}
                    payloadJson={m.proposal.payloadJson}
                    onApprove={() =>
                      onApplyProposal(m.proposal!.proposalId, m.proposal!.toolName, m.proposal!.payloadJson, true)
                    }
                    onReject={() =>
                      onApplyProposal(m.proposal!.proposalId, m.proposal!.toolName, m.proposal!.payloadJson, false)
                    }
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      {isRunning && (
        <div className="flex items-center gap-2 text-cad-cyan text-[11px] p-2 bg-cad-cyan/5 rounded border border-cad-cyan/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Benji is reasoning with Sawhorse...</span>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
};
