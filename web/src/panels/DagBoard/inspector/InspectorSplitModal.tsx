import React, { useState } from 'react';
import { GitFork, X } from 'lucide-react';

interface InspectorSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSplit: (subtasks: string[], sequential: boolean) => Promise<void>;
  sourceKey: string;
}

export const InspectorSplitModal: React.FC<InspectorSplitModalProps> = ({
  isOpen,
  onClose,
  onSplit,
  sourceKey,
}) => {
  const [subtasksText, setSubtasksText] = useState('');
  const [sequential, setSequential] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = subtasksText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (lines.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await onSplit(lines, sequential);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to split task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-cad-surface border border-cad-border rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden text-xs">
        <div className="flex items-center justify-between p-3 border-b border-cad-border bg-cad-bg/50">
          <div className="flex items-center gap-1.5 font-bold text-cad-text">
            <GitFork className="w-4 h-4 text-cad-cyan" />
            <span>Split Task: {sourceKey}</span>
          </div>
          <button onClick={onClose} className="text-cad-muted hover:text-cad-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
          {error && (
            <div className="p-2 rounded bg-red-950/40 border border-red-500/30 text-red-400 text-[11px]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted">
              Child Subtask Titles (One per line)
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Implement schema&#10;Implement CLI command&#10;Add integration tests"
              value={subtasksText}
              onChange={(e) => setSubtasksText(e.target.value)}
              required
              className="bg-cad-bg border border-cad-border rounded p-2 text-cad-text font-mono focus:outline-none focus:border-cad-cyan"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={sequential}
              onChange={(e) => setSequential(e.target.checked)}
              className="rounded bg-cad-bg border-cad-border text-cad-cyan focus:ring-0"
            />
            <span className="text-[11px] text-cad-text">
              Chain sequentially (Subtask 1 blocks 2, 2 blocks 3, etc.)
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-cad-border">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3 py-1.5 rounded border border-cad-border text-cad-muted hover:text-cad-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !subtasksText.trim()}
              className="px-3 py-1.5 rounded bg-cad-cyan text-black font-semibold hover:bg-cad-cyan/90 disabled:opacity-50"
            >
              {submitting ? 'Splitting...' : 'Split Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
