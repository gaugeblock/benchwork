import React, { useState } from 'react';
import { GitFork, Link2 } from 'lucide-react';
import { InspectorLinkModal } from './InspectorLinkModal';
import { InspectorSplitModal } from './InspectorSplitModal';

interface InspectorEdgesProps {
  relatedTasks: [string, string, string][];
  ticketKey: string;
  onLink: (targetKey: string, kind: string) => Promise<void>;
  onSplit: (subtasks: string[], sequential: boolean) => Promise<void>;
}

export const InspectorEdges: React.FC<InspectorEdgesProps> = ({
  relatedTasks,
  ticketKey,
  onLink,
  onSplit,
}) => {
  const [showLink, setShowLink] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-cad-muted tracking-wider flex items-center gap-1">
          <GitFork className="w-3 h-3 text-cad-cyan" /> Related Tasks & Edges (
          {relatedTasks.length})
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLink(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-cad-border bg-cad-bg text-[10px] text-cad-muted hover:text-cad-cyan hover:border-cad-cyan/50"
            title="Link this task to another task"
          >
            <Link2 className="w-3 h-3" />
            <span>Link</span>
          </button>
          <button
            onClick={() => setShowSplit(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-cad-border bg-cad-bg text-[10px] text-cad-muted hover:text-cad-cyan hover:border-cad-cyan/50"
            title="Split task into subtasks"
          >
            <GitFork className="w-3 h-3" />
            <span>Split</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-2 rounded bg-cad-bg border border-cad-border">
        {relatedTasks.length === 0 ? (
          <span className="text-[11px] text-cad-muted italic">
            No linked tasks or dependencies.
          </span>
        ) : (
          relatedTasks.map(([key, title, status], i) => (
            <div
              key={i}
              className="flex items-center justify-between p-1.5 rounded bg-cad-surface border border-cad-border text-[11px]"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-mono font-bold text-cad-cyan">{key}</span>
                <span className="truncate text-cad-text">{title}</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded border uppercase font-mono text-cad-muted">
                {status}
              </span>
            </div>
          ))
        )}
      </div>

      <InspectorLinkModal
        isOpen={showLink}
        onClose={() => setShowLink(false)}
        onLink={onLink}
        sourceKey={ticketKey}
      />

      <InspectorSplitModal
        isOpen={showSplit}
        onClose={() => setShowSplit(false)}
        onSplit={onSplit}
        sourceKey={ticketKey}
      />
    </div>
  );
};
