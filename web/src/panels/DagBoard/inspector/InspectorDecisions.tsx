import React from 'react';
import type { TaskDecision } from '../../../types';
import { CheckCircle2, Clock } from 'lucide-react';

interface InspectorDecisionsProps {
  decisions: TaskDecision[];
  inheritedDecisions?: TaskDecision[];
}

export const InspectorDecisions: React.FC<InspectorDecisionsProps> = ({
  decisions,
  inheritedDecisions = [],
}) => {
  const allDecisions = [
    ...decisions.map((d) => ({ ...d, inherited: false })),
    ...inheritedDecisions.map((d) => ({ ...d, inherited: true })),
  ];

  if (allDecisions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
          Decisions ({allDecisions.length})
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {allDecisions.map((dec) => {
          const isPending = dec.status === 'pending' || !dec.chosen_option;
          return (
            <div
              key={dec.decision_id}
              className={`p-3 rounded border flex flex-col gap-2 ${
                isPending
                  ? 'border-cad-amber/40 bg-cad-amber/5'
                  : 'border-cad-border bg-cad-bg'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <div className="flex items-center gap-1.5 font-bold">
                  {isPending ? (
                    <Clock className="w-3 h-3 text-cad-amber" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-cad-emerald" />
                  )}
                  <span className="text-cad-text uppercase">{dec.category || 'Architecture'}</span>
                  {dec.inherited && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-cad-surface border border-cad-border text-cad-muted">
                      Inherited
                    </span>
                  )}
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded uppercase font-semibold text-[9px] ${
                    isPending
                      ? 'bg-cad-amber/20 text-cad-amber'
                      : 'bg-cad-emerald/20 text-cad-emerald'
                  }`}
                >
                  {isPending ? 'Pending' : 'Resolved'}
                </span>
              </div>

              <p className="text-[11px] text-cad-text leading-snug">{dec.question}</p>

              {/* Options */}
              {dec.proposed_options && dec.proposed_options.length > 0 && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-[9px] text-cad-muted uppercase font-semibold">Options:</span>
                  <div className="flex flex-col gap-1">
                    {dec.proposed_options.map((opt, i) => {
                      const isChosen = opt === dec.chosen_option;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] ${
                            isChosen
                              ? 'bg-cad-emerald/10 border border-cad-emerald/40 text-cad-emerald font-semibold'
                              : 'bg-cad-surface/50 border border-cad-border/40 text-cad-muted'
                          }`}
                        >
                          <span className="text-[9px] font-mono">{i + 1}.</span>
                          <span className="truncate">{opt}</span>
                          {isChosen && <span className="ml-auto text-[9px] uppercase">Chosen</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rationale & Resolver */}
              {dec.rationale && (
                <div className="p-2 rounded bg-cad-surface border border-cad-border/60 text-[10px] flex flex-col gap-1">
                  <span className="text-cad-muted font-semibold">Rationale:</span>
                  <p className="text-cad-text leading-relaxed">{dec.rationale}</p>
                  {dec.resolved_by && (
                    <span className="text-[9px] text-cad-muted self-end">
                      Resolved by: <b className="text-cad-cyan">{dec.resolved_by}</b>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
