import React, { useState, useMemo } from 'react';
import type { TaskNode } from '../../types';
import { ArrowUpDown, Search, Sparkles, HelpCircle, ArrowUp, ArrowDown, GitBranch } from 'lucide-react';

interface TaskTableViewProps {
  tasks: TaskNode[];
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onSynthesize?: (taskId: string) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: (ids: string[]) => void;
}

type SortField = 'ticket_key' | 'title' | 'kind' | 'status' | 'priority' | 'crate';
type SortOrder = 'asc' | 'desc';

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
  onSynthesize,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
}) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('ticket_key');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.ticket_key.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.scope.crate_name && t.scope.crate_name.toLowerCase().includes(q))
      );
    }

    return [...result].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortField) {
        case 'ticket_key': valA = a.ticket_key; valB = b.ticket_key; break;
        case 'title': valA = a.title.toLowerCase(); valB = b.title.toLowerCase(); break;
        case 'kind': valA = a.kind; valB = b.kind; break;
        case 'status': valA = a.status; valB = b.status; break;
        case 'priority': valA = a.priority; valB = b.priority; break;
        case 'crate': valA = a.scope.crate_name || ''; valB = b.scope.crate_name || ''; break;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, search, sortField, sortOrder]);

  const allFilteredIds = useMemo(() => filteredAndSortedTasks.map((t) => t.id), [filteredAndSortedTasks]);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds?.has(id));

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-cad-muted/50" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-cad-cyan" /> : <ArrowDown className="w-3 h-3 text-cad-cyan" />;
  };

  return (
    <div className="flex-1 flex flex-col bg-cad-bg overflow-hidden">
      <div className="px-4 py-2 border-b border-cad-border bg-cad-surface/40 flex items-center justify-between">
        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 text-cad-muted absolute left-2.5 top-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search key, title, or crate..."
            className="w-full bg-cad-bg border border-cad-border text-cad-text text-xs rounded pl-8 pr-3 py-1 focus:outline-none focus:border-cad-cyan"
          />
        </div>
        <span className="text-[11px] text-cad-muted">
          Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-cad-surface sticky top-0 border-b border-cad-border z-10 text-[10px] uppercase font-bold text-cad-muted">
            <tr>
              <th className="py-2 px-3 w-8 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={() => onToggleSelectAll?.(allFilteredIds)}
                  className="rounded border-cad-border bg-cad-bg text-cad-cyan focus:ring-0 cursor-pointer"
                  title="Select all displayed"
                />
              </th>
              <th onClick={() => toggleSort('ticket_key')} className="py-2 px-3 cursor-pointer hover:text-cad-text w-24">
                <div className="flex items-center gap-1">Key {renderSortIcon('ticket_key')}</div>
              </th>
              <th onClick={() => toggleSort('title')} className="py-2 px-3 cursor-pointer hover:text-cad-text">
                <div className="flex items-center gap-1">Title {renderSortIcon('title')}</div>
              </th>
              <th onClick={() => toggleSort('kind')} className="py-2 px-3 cursor-pointer hover:text-cad-text w-24">
                <div className="flex items-center gap-1">Kind {renderSortIcon('kind')}</div>
              </th>
              <th onClick={() => toggleSort('status')} className="py-2 px-3 cursor-pointer hover:text-cad-text w-28">
                <div className="flex items-center gap-1">Status {renderSortIcon('status')}</div>
              </th>
              <th onClick={() => toggleSort('priority')} className="py-2 px-3 cursor-pointer hover:text-cad-text w-20">
                <div className="flex items-center gap-1">Priority {renderSortIcon('priority')}</div>
              </th>
              <th onClick={() => toggleSort('crate')} className="py-2 px-3 cursor-pointer hover:text-cad-text w-36">
                <div className="flex items-center gap-1">Crate {renderSortIcon('crate')}</div>
              </th>
              <th className="py-2 px-3 text-right w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cad-border/60">
            {filteredAndSortedTasks.map((task) => {
              const isDrawerSelected = selectedTaskId === task.id;
              const isChecked = selectedIds?.has(task.id) ?? false;
              const hasPendingDecision = task.decisions?.some((d) => !d.chosen_option);

              return (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className={`cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-cad-cyan/15 border-l-2 border-l-cad-cyan'
                      : isDrawerSelected
                      ? 'bg-cad-cyan/10 border-l-2 border-l-cad-cyan'
                      : 'hover:bg-cad-surface/60'
                  }`}
                >
                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelect?.(task.id)}
                      className="rounded border-cad-border bg-cad-bg text-cad-cyan focus:ring-0 cursor-pointer"
                    />
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-cad-cyan">{task.ticket_key}</td>
                  <td className="py-2.5 px-3 text-cad-text font-medium">
                    <div className="flex items-center gap-1.5 truncate max-w-md">
                      <span className="truncate">{task.title}</span>
                      {hasPendingDecision && (
                        <span title="Needs Decision">
                          <HelpCircle className="w-3.5 h-3.5 text-cad-amber shrink-0" />
                        </span>
                      )}
                      {(task.active_claim?.git_branch || task.verification_receipt?.git_branch) && (
                        <span className="flex items-center gap-0.5 px-1 py-0.2 rounded bg-purple-500/10 border border-purple-500/30 font-mono text-[9px] text-purple-400 shrink-0">
                          <GitBranch className="w-2.5 h-2.5" />
                          {task.active_claim?.git_branch || task.verification_receipt?.git_branch}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-cad-muted uppercase text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-cad-surface border border-cad-border">{task.kind}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[10px] uppercase">
                    <span className="px-1.5 py-0.5 rounded bg-cad-surface border border-cad-border text-cad-text">
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-cad-muted">P{task.priority}</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-cad-cyan truncate">
                    {task.scope.crate_name || 'root'}
                  </td>
                  <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {task.status === 'ready' && onSynthesize && (
                      <button
                        onClick={() => onSynthesize(task.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cad-cyan/15 hover:bg-cad-cyan text-cad-cyan hover:text-cad-bg border border-cad-cyan/40 text-[10px] font-bold transition-colors"
                        title="Run Synthesis"
                      >
                        <Sparkles className="w-3 h-3" /> Run
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

