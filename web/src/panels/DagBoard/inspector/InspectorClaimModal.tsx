import React, { useState } from 'react';
import { ShieldCheck, GitBranch, X, Loader2 } from 'lucide-react';

interface InspectorClaimModalProps {
  isOpen: boolean;
  ticketKey: string;
  slug: string;
  onClose: () => void;
  onClaim: (agentId: string, branch: string) => Promise<void>;
}

export const InspectorClaimModal: React.FC<InspectorClaimModalProps> = ({
  isOpen,
  ticketKey,
  slug,
  onClose,
  onClaim,
}) => {
  const [agentId, setAgentId] = useState('antigravity');
  const [branch, setBranch] = useState(
    `feat/${ticketKey.toLowerCase()}-${slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 25)}`
  );
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onClaim(agentId, branch);
      onClose();
    } catch (err) {
      console.error('Claim failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-cad-surface border border-cad-border w-full max-w-md rounded shadow-2xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-cad-border flex items-center justify-between bg-cad-subsurface">
          <span className="font-bold text-xs flex items-center gap-1.5 text-cad-cyan">
            <ShieldCheck className="w-4 h-4" /> Claim Task & Isolate Branch
          </span>
          <button onClick={onClose} className="text-cad-muted hover:text-cad-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
              Claiming Agent ID
            </label>
            <input
              type="text"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono text-xs focus:outline-none focus:border-cad-cyan"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted tracking-wider flex items-center gap-1">
              <GitBranch className="w-3 h-3 text-purple-400" /> Dedicated Feature Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono text-xs focus:outline-none focus:border-cad-cyan"
              required
            />
            <span className="text-[10px] text-cad-muted">
              Auto-checks out or creates this branch before acquiring claim lease.
            </span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cad-cyan text-cad-bg font-bold text-xs hover:bg-cad-cyan/90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Claiming...</span>
                </>
              ) : (
                <span>Claim & Checkout</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

