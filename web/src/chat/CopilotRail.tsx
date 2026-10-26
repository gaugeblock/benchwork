import React, { useState, useRef, useEffect } from 'react';
import { Bot, ChevronRight, ChevronLeft, Send, Sparkles, Eye, Loader2 } from 'lucide-react';
import { useBenchworkChat, UiViewportContext } from './useBenchworkChat';
import { AutocompletePillBar } from './AutocompletePillBar';
import { XRayInspector } from './XRayInspector';
import { DecisionToolUi } from './tools/DecisionToolUi';
import { DocPatchToolUi } from './tools/DocPatchToolUi';
import { PlanProposalToolUi } from './tools/PlanProposalToolUi';

interface CopilotRailProps {
  activePanel: string;
  focusedTaskKey?: string;
  focusedDocArchetype?: string;
}

export const CopilotRail: React.FC<CopilotRailProps> = ({
  activePanel,
  focusedTaskKey,
  focusedDocArchetype,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showXRay, setShowXRay] = useState(false);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const viewport: UiViewportContext = {
    active_panel: activePanel,
    focused_task_key: focusedTaskKey,
    focused_doc_archetype: focusedDocArchetype,
  };

  const { messages, isRunning, threadId, appendUserMessage, applyProposal } =
    useBenchworkChat(viewport);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isRunning) return;
    setInput('');
    appendUserMessage(trimmed);
  };

  if (collapsed) {
    return (
      <aside className="w-10 border-l border-cad-border bg-cad-surface flex flex-col items-center py-3 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 text-cad-cyan hover:bg-cad-subsurface rounded transition-colors"
          title="Expand Chat Copilot Rail"
          type="button"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="mt-8 [writing-mode:vertical-rl] text-xs font-mono text-cad-muted tracking-widest uppercase">
          Copilot Rail
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-96 border-l border-cad-border bg-cad-surface flex flex-col h-full shrink-0 font-mono text-xs z-20">
      {/* Header */}
      <div className="h-9 border-b border-cad-border bg-cad-subsurface/60 flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cad-cyan" />
          <span className="font-bold uppercase tracking-wider text-cad-text">Copilot Rail</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] bg-cad-cyan/10 text-cad-cyan border border-cad-cyan/30">
            {activePanel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowXRay((prev) => !prev)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border transition-colors ${
              showXRay
                ? 'bg-cad-cyan text-cad-bg font-bold border-cad-cyan'
                : 'text-cad-muted hover:text-cad-text border-cad-border'
            }`}
            title="Inspect Turn Context Envelope (X-Ray)"
            type="button"
          >
            <Eye className="w-3 h-3" />
            <span>X-Ray</span>
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 text-cad-muted hover:text-cad-text rounded"
            title="Collapse Rail"
            type="button"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showXRay && (
        <XRayInspector
          viewport={viewport}
          threadId={threadId}
          onClose={() => setShowXRay(false)}
        />
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-cad-muted space-y-2">
            <Sparkles className="w-8 h-8 text-cad-cyan/40 animate-pulse" />
            <div className="font-semibold text-cad-text">Suite-Aware Assistant</div>
            <div className="text-[11px] leading-relaxed">
              Live viewport context on <span className="text-cad-cyan">{activePanel}</span> is automatically injected on each turn.
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1.5">
            <div className={`flex items-center gap-1 text-[10px] text-cad-muted ${msg.role === 'user' ? 'justify-end' : ''}`}>
              <span>{msg.role === 'user' ? 'Engineer' : 'Copilot'}</span>
            </div>
            <div
              className={`p-2.5 rounded-md leading-relaxed whitespace-pre-wrap break-words ${
                msg.role === 'user'
                  ? 'bg-cad-cyan/10 border border-cad-cyan/30 text-cad-text ml-4'
                  : 'bg-cad-subsurface border border-cad-border text-cad-text mr-4'
              }`}
            >
              {msg.content}
            </div>

            {/* Generative UI Proposal Cards */}
            {msg.proposal && msg.proposal.toolName === 'propose_decision_hole' && (
              <DecisionToolUi
                proposalId={msg.proposal.proposalId}
                payloadJson={msg.proposal.payloadJson}
                onApprove={(chosen) =>
                  applyProposal(msg.proposal!.proposalId, msg.proposal!.toolName, msg.proposal!.payloadJson, true, chosen)
                }
                onReject={() =>
                  applyProposal(msg.proposal!.proposalId, msg.proposal!.toolName, msg.proposal!.payloadJson, false)
                }
              />
            )}
            {msg.proposal && msg.proposal.toolName === 'propose_doc_patch' && (
              <DocPatchToolUi
                proposalId={msg.proposal.proposalId}
                payloadJson={msg.proposal.payloadJson}
                onApprove={() =>
                  applyProposal(msg.proposal!.proposalId, msg.proposal!.toolName, msg.proposal!.payloadJson, true)
                }
                onReject={() =>
                  applyProposal(msg.proposal!.proposalId, msg.proposal!.toolName, msg.proposal!.payloadJson, false)
                }
              />
            )}
            {msg.proposal && msg.proposal.toolName === 'propose_task_plan' && (
              <PlanProposalToolUi
                proposalId={msg.proposal.proposalId}
                payloadJson={msg.proposal.payloadJson}
                onApprove={() =>
                  applyProposal(msg.proposal!.proposalId, msg.proposal!.toolName, msg.proposal!.payloadJson, true)
                }
                onReject={() =>
                  applyProposal(msg.proposal!.proposalId, msg.proposal!.toolName, msg.proposal!.payloadJson, false)
                }
              />
            )}
          </div>
        ))}
        {isRunning && (
          <div className="flex items-center gap-2 text-cad-muted text-[11px] p-2">
            <Loader2 className="w-3.5 h-3.5 text-cad-cyan animate-spin" />
            <span>Reasoning across suite AST and contracts...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick Action Pill Bar */}
      <AutocompletePillBar
        focusedTaskKey={focusedTaskKey}
        onSelect={(snippet) => setInput((prev) => prev + snippet)}
      />

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="p-2 border-t border-cad-border bg-cad-subsurface/40 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask or command on ${activePanel}...`}
          className="flex-1 bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text placeholder:text-cad-muted/60 focus:outline-none focus:border-cad-cyan"
        />
        <button
          type="submit"
          disabled={!input.trim() || isRunning}
          className="p-1.5 rounded bg-cad-cyan text-cad-bg font-bold disabled:opacity-40 hover:bg-cad-cyan/90 transition-colors"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
};

