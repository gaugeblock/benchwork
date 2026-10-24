import React, { useState } from 'react';
import { CheckSquare, Copy, Check } from 'lucide-react';
import { copyTextToClipboard } from './clipboardUtils';

interface InspectorDescriptionProps {
  description?: string;
  acceptanceCriteria?: string[];
}

export const InspectorDescription: React.FC<InspectorDescriptionProps> = ({
  description,
  acceptanceCriteria,
}) => {
  const [descCopied, setDescCopied] = useState(false);
  const [critCopied, setCritCopied] = useState(false);

  const handleCopyDesc = async () => {
    if (!description) return;
    const ok = await copyTextToClipboard(description);
    if (ok) {
      setDescCopied(true);
      setTimeout(() => setDescCopied(false), 2000);
    }
  };

  const handleCopyCrit = async () => {
    if (!acceptanceCriteria?.length) return;
    const text = acceptanceCriteria.map((c) => `- [ ] ${c}`).join('\n');
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCritCopied(true);
      setTimeout(() => setCritCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
            Description
          </span>
          {description && (
            <button
              onClick={handleCopyDesc}
              className="flex items-center gap-1 text-[10px] text-cad-muted hover:text-cad-cyan transition-colors"
              title="Copy description"
            >
              {descCopied ? (
                <>
                  <Check className="w-3 h-3 text-cad-emerald" />
                  <span className="text-cad-emerald font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
        <p className="text-cad-text leading-relaxed bg-cad-bg/60 p-3 rounded border border-cad-border whitespace-pre-wrap select-text cursor-text">
          {description || 'No description provided.'}
        </p>
      </div>

      {/* Acceptance Criteria Checklist */}
      {acceptanceCriteria && acceptanceCriteria.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
              Acceptance Criteria ({acceptanceCriteria.length})
            </span>
            <button
              onClick={handleCopyCrit}
              className="flex items-center gap-1 text-[10px] text-cad-muted hover:text-cad-cyan transition-colors"
              title="Copy acceptance criteria"
            >
              {critCopied ? (
                <>
                  <Check className="w-3 h-3 text-cad-emerald" />
                  <span className="text-cad-emerald font-semibold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded bg-cad-bg border border-cad-border select-text cursor-text">
            {acceptanceCriteria.map((crit, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px] text-cad-text">
                <CheckSquare className="w-3.5 h-3.5 text-cad-cyan shrink-0 mt-0.5" />
                <span className="leading-tight">{crit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
