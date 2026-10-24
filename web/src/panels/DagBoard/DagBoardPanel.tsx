import React, { useEffect, useState, useCallback } from 'react';
import type { DagView, TaskNode } from '../../types';
import { api } from '../../api/client';
import { TaskGraphView } from './TaskGraphView';
import { KanbanBoardView } from './KanbanBoardView';
import { TaskTableView } from './TaskTableView';
import { TaskBriefingDrawer } from './TaskBriefingDrawer';
import { Filter, Columns, Network, List, CheckSquare } from 'lucide-react';

interface DagBoardPanelProps {
  onDiscussInChat?: (task: TaskNode) => void;
}

export const DagBoardPanel: React.FC<DagBoardPanelProps> = ({ onDiscussInChat }) => {
  const [dag, setDag] = useState<DagView | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [needsDecision, setNeedsDecision] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'dag' | 'kanban' | 'list'>('dag');

  const loadDag = useCallback(async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (kindFilter !== 'all') params.kind = kindFilter;
      if (needsDecision) params.needs_decision = true;
      const data = await api.getDag(params);
      setDag(data);
    } catch (err) {
      console.error('Failed loading DAG:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, kindFilter, needsDecision]);

  useEffect(() => {
    loadDag();
  }, [loadDag]);

  const handleSynthesize = async (taskId: string) => {
    try {
      await api.triggerSynthesis({ task_id: taskId, force_in_process: true });
      loadDag();
    } catch (err) {
      console.error('Failed triggering synthesis:', err);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col overflow-hidden bg-cad-bg">
      {/* Top Filter & Metrics Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cad-border bg-cad-surface shrink-0">
        <div className="flex items-center gap-3">
          {/* Status Filter */}
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

          {/* Kind Filter */}
          <div className="flex items-center gap-1.5 text-xs text-cad-muted">
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="bg-cad-bg border border-cad-border text-cad-text text-xs rounded px-2 py-1 focus:outline-none"
            >
              <option value="all">All Kinds</option>
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="refactor">Refactor</option>
              <option value="epic">Epic</option>
              <option value="tech_debt">Tech Debt</option>
            </select>
          </div>

          {/* Needs Decision Filter */}
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

        {/* Stats Summary & View Switcher */}
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
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded ${viewMode === 'list' ? 'bg-cad-cyan/20 text-cad-cyan' : 'text-cad-muted hover:text-cad-text'}`}
              title="Dense Issue Table"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-cad-muted animate-pulse">
          Loading Storypole Backlog...
        </div>
      ) : viewMode === 'dag' ? (
        <TaskGraphView
          tasks={dag?.nodes || []}
          selectedTaskId={selectedTaskId}
          onSelectTask={(id) => setSelectedTaskId(id)}
        />
      ) : viewMode === 'kanban' ? (
        <KanbanBoardView
          tasks={dag?.nodes || []}
          selectedTaskId={selectedTaskId}
          onSelectTask={(id) => setSelectedTaskId(id)}
          onSynthesize={handleSynthesize}
        />
      ) : (
        <TaskTableView
          tasks={dag?.nodes || []}
          selectedTaskId={selectedTaskId}
          onSelectTask={(id) => setSelectedTaskId(id)}
          onSynthesize={handleSynthesize}
        />
      )}

      {/* Rich Task Inspector Slide-Over Drawer */}
      {selectedTaskId && (
        <TaskBriefingDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onSynthesize={handleSynthesize}
          onDiscussInChat={onDiscussInChat}
        />
      )}
    </div>
  );
};
