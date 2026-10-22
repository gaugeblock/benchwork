import React, { useEffect, useState, useCallback } from 'react';
import type { DagView, TaskNode, TaskStatus } from '../../types';
import { api } from '../../api/client';
import { TaskGraphView } from './TaskGraphView';
import { TaskBriefingDrawer } from './TaskBriefingDrawer';
import { Filter, Columns, Network, CheckSquare } from 'lucide-react';

export const DagBoardPanel: React.FC = () => {
  const [dag, setDag] = useState<DagView | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [needsDecision, setNeedsDecision] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'dag' | 'kanban'>('dag');

  const loadDag = useCallback(async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (needsDecision) params.needs_decision = true;
      const data = await api.getDag(params);
      setDag(data);
    } catch (err) {
      console.error('Failed loading DAG:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, needsDecision]);

  useEffect(() => {
    loadDag();
  }, [loadDag]);

  const kanbanColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'ready', label: 'Ready', color: 'border-cad-cyan text-cad-cyan' },
    { status: 'in_progress', label: 'In Progress', color: 'border-cad-cyan/60 text-cad-cyan' },
    { status: 'blocked', label: 'Blocked', color: 'border-cad-amber text-cad-amber' },
    { status: 'verified', label: 'Verified', color: 'border-cad-emerald text-cad-emerald' },
  ];

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-cad-bg">
      {/* Top Filter & Metrics Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cad-border bg-cad-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-cad-muted">
            <Filter className="w-3.5 h-3.5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-cad-bg border border-cad-border text-cad-text text-xs rounded px-2 py-1 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready</option>
              <option value="in_progress">In Progress</option>
              <option value="verified">Verified</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-cad-muted cursor-pointer">
            <input
              type="checkbox"
              checked={needsDecision}
              onChange={(e) => setNeedsDecision(e.target.checked)}
              className="rounded border-cad-border bg-cad-bg text-cad-amber focus:ring-0"
            />
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-cad-amber" />
              Needs Decision
            </span>
          </label>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-cad-bg border border-cad-border">
            <span className="text-cad-muted">Total: <b className="text-cad-text">{dag?.stats.total || 0}</b></span>
            <span className="text-cad-cyan">Ready: <b>{dag?.stats.ready || 0}</b></span>
            <span className="text-cad-amber">Blocked: <b>{dag?.stats.blocked || 0}</b></span>
            <span className="text-cad-emerald">Verified: <b>{dag?.stats.verified || 0}</b></span>
          </div>

          <div className="flex bg-cad-bg border border-cad-border rounded p-0.5">
            <button
              onClick={() => setViewMode('dag')}
              className={`p-1 rounded ${viewMode === 'dag' ? 'bg-cad-cyan/20 text-cad-cyan' : 'text-cad-muted hover:text-cad-text'}`}
              title="CAD DAG View"
            >
              <Network className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1 rounded ${viewMode === 'kanban' ? 'bg-cad-cyan/20 text-cad-cyan' : 'text-cad-muted hover:text-cad-text'}`}
              title="Kanban Board"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-cad-muted animate-pulse">
          Loading Storypole Task DAG...
        </div>
      ) : viewMode === 'dag' ? (
        <TaskGraphView
          tasks={dag?.nodes || []}
          selectedTaskId={selectedTaskId}
          onSelectTask={(id) => setSelectedTaskId(id)}
        />
      ) : (
        /* Kanban Mode */
        <div className="flex-1 grid grid-cols-4 gap-3 p-4 overflow-x-auto bg-cad-bg">
          {kanbanColumns.map((col) => {
            const colTasks = (dag?.nodes || []).filter((t) => t.status === col.status);
            return (
              <div key={col.status} className="flex flex-col rounded bg-cad-surface/50 border border-cad-border overflow-hidden">
                <div className={`px-3 py-2 border-b border-cad-border bg-cad-subsurface flex items-center justify-between text-xs font-bold ${col.color}`}>
                  <span>{col.label}</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-cad-bg rounded border border-cad-border">
                    {colTasks.length}
                  </span>
                </div>
                <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-2">
                  {colTasks.map((task: TaskNode) => (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`p-2.5 rounded border bg-cad-surface hover:border-cad-borderLight cursor-pointer transition-colors flex flex-col gap-1.5 ${
                        selectedTaskId === task.id ? 'border-cad-cyan' : 'border-cad-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-cad-text">{task.ticket_key}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cad-bg border border-cad-border text-cad-muted">
                          {task.kind}
                        </span>
                      </div>
                      <p className="text-[11px] text-cad-text leading-tight">{task.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Briefing Slide-Over Drawer */}
      {selectedTaskId && (
        <TaskBriefingDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
};
