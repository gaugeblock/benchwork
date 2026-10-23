import React from 'react';
import type { TaskNode, TaskStatus } from '../../types';
import { Sparkles, Layers, Tag } from 'lucide-react';

interface KanbanBoardViewProps {
  tasks: TaskNode[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onSynthesize?: (taskId: string) => void;
}

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
  onSynthesize,
}) => {
  const kanbanColumns: {
    key: string;
    label: string;
    statuses: TaskStatus[];
    color: string;
    borderAccent: string;
  }[] = [
    {
      key: 'ready',
      label: 'Ready',
      statuses: ['ready'],
      color: 'text-cad-cyan',
      borderAccent: 'border-t-2 border-t-cad-cyan',
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      statuses: ['in_progress', 'synthesizing', 'verifying'],
      color: 'text-blue-400',
      borderAccent: 'border-t-2 border-t-blue-400',
    },
    {
      key: 'blocked',
      label: 'Blocked',
      statuses: ['blocked'],
      color: 'text-cad-amber',
      borderAccent: 'border-t-2 border-t-cad-amber',
    },
    {
      key: 'verified',
      label: 'Verified',
      statuses: ['verified'],
      color: 'text-cad-emerald',
      borderAccent: 'border-t-2 border-t-cad-emerald',
    },
  ];

  return (
    <div className="flex-1 grid grid-cols-4 gap-3 p-4 overflow-x-auto bg-cad-bg">
      {kanbanColumns.map((col) => {
        const colTasks = tasks.filter((t) => col.statuses.includes(t.status));
        return (
          <div
            key={col.key}
            className={`flex flex-col rounded bg-cad-surface/50 border border-cad-border overflow-hidden ${col.borderAccent}`}
          >
            {/* Column Header */}
            <div className="px-3 py-2 border-b border-cad-border bg-cad-subsurface flex items-center justify-between text-xs font-bold">
              <span className={col.color}>{col.label}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-cad-bg rounded border border-cad-border text-cad-muted">
                {colTasks.length}
              </span>
            </div>

            {/* Column Cards */}
            <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-2">
              {colTasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className={`p-2.5 rounded border bg-cad-surface hover:border-cad-borderLight cursor-pointer transition-all flex flex-col gap-2 shadow-sm ${
                      isSelected ? 'border-cad-cyan ring-1 ring-cad-cyan' : 'border-cad-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold font-mono text-cad-cyan">
                        {task.ticket_key}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cad-bg border border-cad-border text-cad-muted uppercase font-medium">
                          {task.kind}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-cad-bg text-cad-text border border-cad-border">
                          P{task.priority}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-cad-text leading-tight line-clamp-2">
                      {task.title}
                    </p>

                    {/* Metadata / Tags */}
                    <div className="flex flex-wrap items-center gap-1 text-[9px] text-cad-muted">
                      {task.scope.crate_name && (
                        <span className="flex items-center gap-0.5 px-1 rounded bg-cad-bg border border-cad-border font-mono text-cad-cyan">
                          <Layers className="w-2.5 h-2.5" />
                          {task.scope.crate_name}
                        </span>
                      )}
                      {task.scope.labels?.slice(0, 2).map((l, i) => (
                        <span
                          key={i}
                          className="flex items-center gap-0.5 px-1 rounded bg-cad-bg border border-cad-border"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {l}
                        </span>
                      ))}
                    </div>

                    {/* Ready Action: Synthesize */}
                    {task.status === 'ready' && onSynthesize && (
                      <div className="pt-1 border-t border-cad-border/50 flex items-center justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSynthesize(task.id);
                          }}
                          className="flex items-center gap-1 px-2 py-1 rounded bg-cad-cyan/15 hover:bg-cad-cyan text-cad-cyan hover:text-cad-bg border border-cad-cyan/40 text-[10px] font-bold transition-colors"
                          title="Trigger Code Synthesis"
                        >
                          <Sparkles className="w-3 h-3" />
                          Synthesize
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
