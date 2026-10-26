import React from 'react';
import { FileDiff, Check, X, ShieldAlert } from 'lucide-react';

interface DocPatchPayload {
  target_doc: string;
  patch_summary: string;
  diff_content: string;
}

interface DocPatchToolUiProps {
  proposalId: string;
  payloadJson: string;
  onApprove: () => void;
  onReject: () => void;
}

export const DocPatchToolUi: React.FC<DocPatchToolUiProps> = ({
  proposalId,
  payloadJson,
  onApprove,
  onReject,
}) => {
  let parsed: DocPatchPayload = {
    target_doc: 'SPEC.md',
    patch_summary: 'Targeted documentation amendment',
    diff_content: '',
  };
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    // Fallback if raw text
  }

  return (
    <div className="my-2 p-3 bg-cad-surface border border-cad-green/50 rounded-md font-mono text-xs space-y-2 shadow-sm">
      <div className="flex items-center justify-between text-cad-green font-bold border-b border-cad-border/60 pb-1">
        <div className="flex items-center gap-1.5">
          <FileDiff className="w-4 h-4 text-cad-green" />
          <span>Documentation Patch Proposal ({parsed.target_doc})</span>
        </div>
        <span className="text-[10px] text-cad-muted">ID: {proposalId.slice(0, 8)}</span>
      </div>

      <div className="text-cad-text text-[11px]">{parsed.patch_summary}</div>

      {parsed.diff_content && (
        <div className="bg-cad-bg p-2 rounded border border-cad-border/50 text-[11px] overflow-x-auto max-h-36 scrollbar-thin">
          <pre className="text-cad-text leading-tight">{parsed.diff_content}</pre>
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
            className="flex items-center gap-1 px-3 py-1 rounded bg-cad-green hover:bg-cad-green/90 text-cad-bg font-semibold transition-colors text-[11px]"
          >
            <Check className="w-3 h-3" /> Apply Patch
          </button>
        </div>
      </div>
    </div>
  );
};

