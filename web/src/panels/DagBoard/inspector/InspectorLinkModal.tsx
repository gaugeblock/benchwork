import React, { useState } from 'react';
import { Link2, X } from 'lucide-react';

interface InspectorLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (targetKey: string, kind: string) => Promise<void>;
  sourceKey: string;
}

export const InspectorLinkModal: React.FC<InspectorLinkModalProps> = ({
  isOpen,
  onClose,
  onLink,
  sourceKey,
}) => {
  const [targetKey, setTargetKey] = useState('');
  const [kind, setKind] = useState('blocked_by');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetKey.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onLink(targetKey.trim().toUpperCase(), kind);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to link tasks');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-cad-surface border border-cad-border rounded-lg shadow-2xl w-full max-w-sm flex flex-col overflow-hidden text-xs">
        <div className="flex items-center justify-between p-3 border-b border-cad-border bg-cad-bg/50">
          <div className="flex items-center gap-1.5 font-bold text-cad-text">
            <Link2 className="w-4 h-4 text-cad-cyan" />
            <span>Link Edge: {sourceKey}</span>
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
              Relationship Kind
            </label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text focus:outline-none focus:border-cad-cyan"
            >
              <option value="blocked_by">Blocked By (Dependency)</option>
              <option value="related_to">Related To (Association)</option>
              <option value="parent_epic">Parent Epic (Hierarchy)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted">
              Target Ticket Key
            </label>
            <input
              type="text"
              placeholder="e.g. GB-14 or 0867fca7-..."
              value={targetKey}
              onChange={(e) => setTargetKey(e.target.value)}
              required
              className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono focus:outline-none focus:border-cad-cyan"
            />
          </div>

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
              disabled={submitting || !targetKey.trim()}
              className="px-3 py-1.5 rounded bg-cad-cyan text-black font-semibold hover:bg-cad-cyan/90 disabled:opacity-50"
            >
              {submitting ? 'Linking...' : 'Add Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
