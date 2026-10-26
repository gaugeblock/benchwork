import React, { useState } from 'react';
import type { PendingDecision } from '../../types';
import { api } from '../../api/client';
import { CheckCircle2, HelpCircle, ArrowRight, CornerDownRight } from 'lucide-react';

interface DecisionCardProps {
  decision: PendingDecision;
  onResolved: () => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ decision, onResolved }) => {
  const [selectedOption, setSelectedOption] = useState<string>(decision.options[0] || '');
  const [rationale, setRationale] = useState<string>('');
  const [spawnFollowup, setSpawnFollowup] = useState<boolean>(false);
  const [resolving, setResolving] = useState<boolean>(false);
  const [resolved, setResolved] = useState<boolean>(false);

  const handleResolve = async () => {
    if (!selectedOption || !rationale.trim()) return;
    setResolving(true);
    try {
      await api.resolveDecision({
        task_id: decision.task_id,
        decision_id: decision.decision_id,
        chosen_option: selectedOption,
        rationale: rationale.trim(),
        spawn_followup: spawnFollowup,
      });
      setResolved(true);
      setTimeout(() => {
        onResolved();
      }, 800);
    } catch (err) {
      alert(`Failed to resolve decision: ${err}`);
    } finally {
      setResolving(false);
    }
  };

  if (resolved) {
    return (
      <div className="p-4 border border-cad-emerald/40 bg-cad-emerald/10 rounded flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-cad-emerald animate-pulse" />
        <span className="text-xs font-semibold text-cad-emerald">
          Decision resolved and appended to SPEC.md!
        </span>
      </div>
    );
  }

  return (
    <div className="border border-cad-border bg-cad-surface rounded p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cad-amber shrink-0" />
          <span className="text-xs font-bold text-cad-text uppercase tracking-wider">
            {decision.prompt}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] px-2 py-0.5 border border-cad-borderLight bg-cad-subsurface rounded text-cad-muted">
            {decision.source}
          </span>
          {decision.task_id && (
            <span className="text-[10px] px-2 py-0.5 border border-cad-cyan/30 text-cad-cyan bg-cad-cyan/10 rounded">
              Linked
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-1">
        <span className="text-[11px] text-cad-muted">Select Resolution Option:</span>
        <div className="grid grid-cols-1 gap-1.5">
          {decision.options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedOption(option)}
              className={`text-left text-xs px-3 py-2 rounded border transition-colors flex items-center justify-between ${
                selectedOption === option
                  ? 'border-cad-cyan bg-cad-cyan/10 text-cad-cyan font-medium'
                  : 'border-cad-border bg-cad-subsurface text-cad-text hover:border-cad-borderLight'
              }`}
            >
              <span>{option}</span>
              {selectedOption === option && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1 mt-1">
        <label className="text-[11px] text-cad-muted">Architectural Rationale / Justification:</label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Document the technical justification for this choice..."
          rows={2}
          className="w-full text-xs bg-cad-bg border border-cad-border rounded p-2 text-cad-text focus:outline-none focus:border-cad-cyan resize-none"
        />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-cad-border/60">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-cad-muted hover:text-cad-text">
          <input
            type="checkbox"
            checked={spawnFollowup}
            onChange={(e) => setSpawnFollowup(e.target.checked)}
            className="rounded border-cad-border bg-cad-bg text-cad-cyan focus:ring-0"
          />
          <span className="flex items-center gap-1">
            <CornerDownRight className="w-3 h-3 text-cad-cyan" />
            Spawn follow-up decision
          </span>
        </label>

        <button
          type="button"
          disabled={resolving || !selectedOption || !rationale.trim()}
          onClick={handleResolve}
          className="px-3 py-1.5 bg-cad-cyan/20 border border-cad-cyan text-cad-cyan hover:bg-cad-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-semibold flex items-center gap-1.5 transition-all"
        >
          {resolving ? 'Persisting...' : 'Resolve Decision'}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
