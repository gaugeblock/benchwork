import React, { useState } from 'react';
import type { TaskNode } from '../../../types';
import { X, Loader2, Sparkles, ShieldCheck, Clock, Edit3 } from 'lucide-react';
import { InspectorClaimModal } from './InspectorClaimModal';
import { InspectorHandoffModal } from './InspectorHandoffModal';
import { InspectorEditModal } from './InspectorEditModal';

interface InspectorHeaderProps {
  task: TaskNode;
  onClose: () => void;
  onSynthesize?: (taskId: string) => void;
  synthesizing?: boolean;
  onClaim?: (agentId: string, branch: string) => Promise<void>;
  onHandoff?: (data: {
    recorded_by_agent: string;
    completed_items: string[];
    remaining_items: string[];
    last_error_or_blocker?: string;
    status: string;
  }) => Promise<void>;
  onUpdate?: (data: any) => Promise<void>;
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({
  task,
  onClose,
  onSynthesize,
  synthesizing,
  onClaim,
  onHandoff,
  onUpdate,
}) => {
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'text-cad-cyan border-cad-cyan/40 bg-cad-cyan/10';
      case 'in_progress':
      case 'synthesizing':
      case 'verifying':
        return 'text-blue-400 border-blue-400/40 bg-blue-400/10';
      case 'verified':
        return 'text-cad-emerald border-cad-emerald/40 bg-cad-emerald/10';
      case 'blocked':
        return 'text-cad-amber border-cad-amber/40 bg-cad-amber/10';
      case 'deferred':
        return 'text-purple-400 border-purple-400/40 bg-purple-400/10';
      default:
        return 'text-cad-muted border-cad-border bg-cad-bg';
    }
  };

  const isReady = task.status === 'ready';
  const isInProgress = task.status === 'in_progress';

  return (
    <div className="flex flex-col border-b border-cad-border bg-cad-subsurface/80 p-4 gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold font-mono text-cad-cyan">{task.ticket_key}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-semibold ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ')}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded border border-cad-border bg-cad-bg text-cad-muted uppercase font-medium">
            {task.kind}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-cad-border/40 text-cad-text">
            P{task.priority}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-cad-surface rounded text-cad-muted hover:text-cad-text transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <h2 className="text-sm font-semibold text-cad-text leading-snug">{task.title}</h2>

      {/* Action Row */}
      <div className="pt-1 flex flex-wrap items-center gap-2">
        {isReady && onClaim && (
          <button
            onClick={() => setShowClaimModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 transition-all shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Claim Task</span>
          </button>
        )}

        {isReady && onSynthesize && (
          <button
            onClick={() => onSynthesize(task.id)}
            disabled={synthesizing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cad-cyan text-cad-bg font-bold text-xs hover:bg-cad-cyan/90 disabled:opacity-50 transition-all shadow-sm"
          >
            {synthesizing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Triggering Synthesis...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run Synthesis</span>
              </>
            )}
          </button>
        )}

        {isInProgress && onHandoff && (
          <button
            onClick={() => setShowHandoffModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold text-xs hover:bg-blue-500/30 transition-all"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Record Handoff</span>
          </button>
        )}

        {onUpdate && (
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-cad-surface border border-cad-border text-cad-muted hover:text-cad-text text-xs transition-colors"
            title="Edit Task Details & Scope"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        )}
      </div>

      {onClaim && (
        <InspectorClaimModal
          isOpen={showClaimModal}
          ticketKey={task.ticket_key}
          slug={task.slug}
          onClose={() => setShowClaimModal(false)}
          onClaim={onClaim}
        />
      )}

      {onHandoff && (
        <InspectorHandoffModal
          isOpen={showHandoffModal}
          agentId={task.active_claim?.agent_id || 'antigravity'}
          onClose={() => setShowHandoffModal(false)}
          onSubmit={onHandoff}
        />
      )}

      {onUpdate && (
        <InspectorEditModal
          isOpen={showEditModal}
          task={task}
          onClose={() => setShowEditModal(false)}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};
