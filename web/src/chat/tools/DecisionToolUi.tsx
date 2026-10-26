import React, { useState } from 'react';
import { HelpCircle, Check, X, ShieldAlert } from 'lucide-react';

interface DecisionProposalPayload {
  question: string;
  options: string[];
  category?: string;
}

interface DecisionToolUiProps {
  proposalId: string;
  payloadJson: string;
  onApprove: (chosen: string) => void;
  onReject: () => void;
}

export const DecisionToolUi: React.FC<DecisionToolUiProps> = ({
  proposalId,
  payloadJson,
  onApprove,
  onReject,
}) => {
  let parsed: DecisionProposalPayload = { question: 'Pending decision', options: [] };
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    // Fallback if raw text
  }

  const [selectedOption, setSelectedOption] = useState<string>(
    parsed.options[0] || 'Accept'
  );

  return (
    <div className="my-2 p-3 bg-cad-surface border border-cad-cyan/50 rounded-md font-mono text-xs space-y-2 shadow-sm">
      <div className="flex items-center justify-between text-cad-cyan font-bold border-b border-cad-border/60 pb-1">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-cad-cyan" />
          <span>Architectural Decision Hole Proposal</span>
        </div>
        <span className="text-[10px] text-cad-muted">ID: {proposalId.slice(0, 8)}</span>
      </div>

      <div className="text-cad-text font-semibold">{parsed.question}</div>

      {parsed.options.length > 0 && (
        <div className="space-y-1 my-2">
          <div className="text-[11px] text-cad-muted">Select Proposed Option:</div>
          {parsed.options.map((opt) => (
            <label
              key={opt}
              className={`flex items-center gap-2 p-1.5 rounded cursor-pointer border text-[11px] transition-colors ${
                selectedOption === opt
                  ? 'bg-cad-cyan/10 border-cad-cyan text-cad-cyan'
                  : 'bg-cad-bg border-cad-border text-cad-muted hover:border-cad-muted'
              }`}
            >
              <input
                type="radio"
                name={`dec-${proposalId}`}
                value={opt}
                checked={selectedOption === opt}
                onChange={() => setSelectedOption(opt)}
                className="accent-cad-cyan"
              />
              <span>{opt}</span>
            </label>
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
            onClick={() => onApprove(selectedOption)}
            type="button"
            className="flex items-center gap-1 px-3 py-1 rounded bg-cad-cyan hover:bg-cad-cyan/90 text-cad-bg font-semibold transition-colors text-[11px]"
          >
            <Check className="w-3 h-3" /> Approve &amp; Decide
          </button>
        </div>
      </div>
    </div>
  );
};

