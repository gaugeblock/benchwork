import React from 'react';
import { ListOrdered, Check, X, ShieldAlert } from 'lucide-react';

interface TaskPlanPayload {
  task_key: string;
  summary: string;
  steps: string[];
}

interface PlanProposalToolUiProps {
  proposalId: string;
  payloadJson: string;
  onApprove: () => void;
  onReject: () => void;
}

export const PlanProposalToolUi: React.FC<PlanProposalToolUiProps> = ({
  proposalId,
  payloadJson,
  onApprove,
  onReject,
}) => {
  let parsed: TaskPlanPayload = {
    task_key: 'GB-XX',
    summary: 'Architectural Blueprint',
    steps: [],
  };
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    // Fallback if raw text
  }

  return (
    <div className="my-2 p-3 bg-cad-surface border border-cad-cyan/50 rounded-md font-mono text-xs space-y-2 shadow-sm">
      <div className="flex items-center justify-between text-cad-cyan font-bold border-b border-cad-border/60 pb-1">
        <div className="flex items-center gap-1.5">
          <ListOrdered className="w-4 h-4 text-cad-cyan" />
          <span>TaskPlan Execution Proposal ({parsed.task_key})</span>
        </div>
        <span className="text-[10px] text-cad-muted">ID: {proposalId.slice(0, 8)}</span>
      </div>

      <div className="text-cad-text font-semibold">{parsed.summary}</div>

      {parsed.steps.length > 0 && (
        <div className="bg-cad-bg p-2 rounded border border-cad-border/40 space-y-1">
          <div className="text-[10px] text-cad-muted uppercase tracking-wider">Ordered Plan Steps:</div>
          {parsed.steps.map((step, idx) => (
            <div key={step} className="flex items-start gap-1.5 text-[11px] text-cad-text">
              <span className="text-cad-cyan font-bold">[{idx + 1}]</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-cad-border/40">
        <div className="flex items-center gap-1 text-[10px] text-cad-yellow">
          <ShieldAlert className="w-3 h-3" />
          <span>Requires Human Approval</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cad-bg hover:bg-cad-red/20 text-cad-muted hover:text-cad-red border border-cad-border transition-colors text-[11px]"
          >
            <X className="w-3 h-3" /> Reject
          </button>
          <button
            onClick={onApprove}
            type="button"
            className="flex items-center gap-1 px-3 py-1 rounded bg-cad-cyan hover:bg-cad-cyan/90 text-cad-bg font-semibold transition-colors text-[11px]"
          >
            <Check className="w-3 h-3" /> Approve Plan
          </button>
        </div>
      </div>
    </div>
  );
};

