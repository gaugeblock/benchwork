import React, { useState } from 'react';
import { Clock, X, Loader2 } from 'lucide-react';

interface InspectorHandoffModalProps {
  isOpen: boolean;
  agentId: string;
  onClose: () => void;
  onSubmit: (data: {
    recorded_by_agent: string;
    completed_items: string[];
    remaining_items: string[];
    last_error_or_blocker?: string;
    status: string;
  }) => Promise<void>;
}

export const InspectorHandoffModal: React.FC<InspectorHandoffModalProps> = ({
  isOpen,
  agentId,
  onClose,
  onSubmit,
}) => {
  const [completedText, setCompletedText] = useState('');
  const [remainingText, setRemainingText] = useState('');
  const [blocker, setBlocker] = useState('');
  const [status, setStatus] = useState('ready');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const completed = completedText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const remaining = remainingText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await onSubmit({
        recorded_by_agent: agentId,
        completed_items: completed,
        remaining_items: remaining,
        last_error_or_blocker: blocker.trim() || undefined,
        status,
      });
      onClose();
    } catch (err) {
      console.error('Handoff failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-cad-surface border border-cad-border w-full max-w-md rounded shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-cad-border flex items-center justify-between bg-cad-subsurface">
          <span className="font-bold text-xs flex items-center gap-1.5 text-blue-400">
            <Clock className="w-4 h-4" /> Record Agent Handoff Packet
          </span>
          <button onClick={onClose} className="text-cad-muted hover:text-cad-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
              Completed Items (one per line)
            </label>
            <textarea
              value={completedText}
              onChange={(e) => setCompletedText(e.target.value)}
              rows={2}
              placeholder="Added types...&#10;Passed unit tests..."
              className="bg-cad-bg border border-cad-border rounded p-2 text-cad-text text-xs focus:outline-none focus:border-cad-cyan"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
              Remaining Items (one per line)
            </label>
            <textarea
              value={remainingText}
              onChange={(e) => setRemainingText(e.target.value)}
              rows={2}
              placeholder="Verify CLI flags...&#10;Update docs..."
              className="bg-cad-bg border border-cad-border rounded p-2 text-cad-text text-xs focus:outline-none focus:border-cad-cyan"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
              Blocker or Error (optional)
            </label>
            <input
              type="text"
              value={blocker}
              onChange={(e) => setBlocker(e.target.value)}
              placeholder="E.g., waiting for upstream decision..."
              className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text text-xs focus:outline-none focus:border-cad-cyan"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
              Post-Handoff Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text text-xs focus:outline-none focus:border-cad-cyan"
            >
              <option value="ready">Ready (Return to backlog for another agent)</option>
              <option value="blocked">Blocked (Mark as blocked)</option>
              <option value="deferred">Deferred (Park for later)</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-cad-border/50">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-cad-border text-cad-muted hover:text-cad-text text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-500 text-white font-bold text-xs hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Record & Release Lease</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

