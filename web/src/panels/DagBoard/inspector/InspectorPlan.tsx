import React, { useState } from 'react';
import type { TaskPlan } from '../../../types';
import {
  FileText,
  CheckCircle2,
  Circle,
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileCode,
} from 'lucide-react';

interface InspectorPlanProps {
  plan?: TaskPlan;
  ticketKey: string;
  onToggleStep?: (stepId: string, completed: boolean) => void;
}

export const InspectorPlan: React.FC<InspectorPlanProps> = ({
  plan,
  ticketKey,
  onToggleStep,
}) => {
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!plan) return null;

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const completedCount = plan.steps.filter((s) => s.completed).length;

  return (
    <div className="flex flex-col gap-2 p-3 rounded bg-cad-bg border border-cad-border">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-cad-cyan tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" /> Execution Plan & Blueprint
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cad-surface border border-cad-border text-cad-muted">
          {completedCount} / {plan.steps.length} Steps
        </span>
      </div>

      {/* Plan Summary */}
      <p className="text-[11px] text-cad-text font-medium leading-relaxed">
        {plan.summary}
      </p>

      {/* Plan File Path */}
      {plan.plan_file_path && (
        <div className="flex items-center justify-between gap-1 p-1.5 rounded bg-cad-surface border border-cad-border text-[10px] font-mono text-cad-muted">
          <span className="truncate flex items-center gap-1">
            <FileCode className="w-3 h-3 text-cad-cyan shrink-0" />
            <span className="truncate">{plan.plan_file_path}</span>
          </span>
          <button
            onClick={() => copyPath(plan.plan_file_path || '')}
            className="text-cad-muted hover:text-cad-text shrink-0"
            title="Copy plan file path"
          >
            {copied ? (
              <Check className="w-3 h-3 text-cad-emerald" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>
      )}

      {/* Steps Checklist */}
      {plan.steps.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[9px] uppercase font-bold text-cad-muted">Steps:</span>
          <div className="flex flex-col gap-1">
            {plan.steps.map((step) => (
              <div
                key={step.step_id}
                onClick={() => onToggleStep?.(step.step_id, !step.completed)}
                className={`p-2 rounded border flex flex-col gap-1 transition-colors cursor-pointer ${
                  step.completed
                    ? 'bg-cad-surface/40 border-cad-emerald/30'
                    : 'bg-cad-surface border-cad-border hover:border-cad-borderLight'
                }`}
              >
                <div className="flex items-center gap-2">
                  {step.completed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-cad-emerald shrink-0" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-cad-muted shrink-0" />
                  )}
                  <span className="font-mono font-bold text-[10px] text-cad-cyan shrink-0">
                    {step.step_id}
                  </span>
                  <span
                    className={`text-[11px] leading-tight truncate ${
                      step.completed ? 'line-through text-cad-muted' : 'text-cad-text'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {/* Gate & Target Files */}
                {(step.verification_gate || step.target_files.length > 0) && (
                  <div className="flex flex-wrap items-center gap-1 text-[9px] pl-5.5 text-cad-muted">
                    {step.verification_gate && (
                      <span className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-cad-bg border border-cad-border font-mono text-cad-cyan">
                        <Terminal className="w-2.5 h-2.5" />
                        {step.verification_gate}
                      </span>
                    )}
                    {step.target_files.map((file, i) => (
                      <span
                        key={i}
                        className="px-1 py-0.2 rounded bg-cad-bg border border-cad-border font-mono truncate max-w-[140px]"
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blueprint Markdown Collapsible Viewer */}
      {plan.design_markdown && (
        <div className="pt-2 border-t border-cad-border/50 flex flex-col gap-1.5">
          <button
            onClick={() => setShowMarkdown(!showMarkdown)}
            className="flex items-center justify-between text-[10px] text-cad-cyan hover:underline font-semibold"
          >
            <span>Design Blueprint ({ticketKey}.md)</span>
            {showMarkdown ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {showMarkdown && (
            <div className="p-2.5 rounded bg-cad-surface border border-cad-border text-[10px] font-mono text-cad-text max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {plan.design_markdown}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
