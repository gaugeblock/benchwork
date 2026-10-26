import React from 'react';
import { Archive, X, Loader2 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkArchive: () => void;
  isArchiving?: boolean;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onClearSelection,
  onBulkArchive,
  isArchiving = false,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      data-testid="bulk-action-bar"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-cad-surface border border-cad-cyan/50 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-cad-cyan animate-pulse" />
        <span className="text-xs font-medium text-cad-text">
          <strong className="text-cad-cyan font-mono">{selectedCount}</strong>{' '}
          {selectedCount === 1 ? 'task' : 'tasks'} selected
        </span>
      </div>

      <div className="h-4 w-[1px] bg-cad-border" />

      <div className="flex items-center gap-2">
        <button
          onClick={onBulkArchive}
          disabled={isArchiving}
          data-testid="bulk-archive-button"
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 hover:border-cad-cyan/50 text-xs font-medium transition-colors disabled:opacity-50"
          title="Archive selected tasks"
        >
          {isArchiving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cad-cyan" />
          ) : (
            <Archive className="w-3.5 h-3.5 text-cad-cyan" />
          )}
          <span>Archive Selected</span>
        </button>

        <button
          onClick={onClearSelection}
          disabled={isArchiving}
          className="p-1 rounded text-cad-muted hover:text-cad-text hover:bg-cad-bg transition-colors"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
