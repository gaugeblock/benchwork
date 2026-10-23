import React from 'react';
import type { TaskNode } from '../../../types';
import { X, Loader2, Sparkles } from 'lucide-react';

interface InspectorHeaderProps {
  task: TaskNode;
  onClose: () => void;
  onSynthesize?: (taskId: string) => void;
  synthesizing?: boolean;
}

export const InspectorHeader: React.FC<InspectorHeaderProps> = ({
  task,
  onClose,
  onSynthesize,
  synthesizing,
}) => {
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

      {isReady && onSynthesize && (
        <div className="pt-1 flex items-center gap-2">
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
          <span className="text-[10px] text-cad-muted">Task ready for code generation</span>
        </div>
      )}
    </div>
  );
};
