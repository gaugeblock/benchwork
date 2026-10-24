import React, { useState } from 'react';
import type { TaskNode } from '../../../types';
import { Edit3, X, Loader2 } from 'lucide-react';

interface InspectorEditModalProps {
  isOpen: boolean;
  task: TaskNode;
  onClose: () => void;
  onUpdate: (data: {
    title?: string;
    description?: string;
    priority?: number;
    repo?: string;
    crate_name?: string;
    module_path?: string;
    target_files?: string[];
    target_symbols?: string[];
    labels?: string[];
    acceptance_criteria?: string[];
  }) => Promise<void>;
}

export const InspectorEditModal: React.FC<InspectorEditModalProps> = ({
  isOpen,
  task,
  onClose,
  onUpdate,
}) => {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState(task.priority);
  const [description, setDescription] = useState(task.description);
  const [repo, setRepo] = useState(task.scope.repo || '');
  const [crateName, setCrateName] = useState(task.scope.crate_name || '');
  const [modulePath, setModulePath] = useState(task.scope.module_path || '');
  const [filesText, setFilesText] = useState(task.scope.target_files.join(', '));
  const [symbolsText, setSymbolsText] = useState(task.scope.target_symbols.join(', '));
  const [labelsText, setLabelsText] = useState(task.scope.labels.join(', '));
  const [criteriaText, setCriteriaText] = useState(task.acceptance_criteria.join('\n'));
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const target_files = filesText.split(',').map((s) => s.trim()).filter(Boolean);
      const target_symbols = symbolsText.split(',').map((s) => s.trim()).filter(Boolean);
      const labels = labelsText.split(',').map((s) => s.trim()).filter(Boolean);
      const acceptance_criteria = criteriaText.split('\n').map((s) => s.trim()).filter(Boolean);

      await onUpdate({
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        priority,
        repo: repo.trim() || undefined,
        crate_name: crateName.trim() || undefined,
        module_path: modulePath.trim() || undefined,
        target_files: target_files.length > 0 ? target_files : undefined,
        target_symbols: target_symbols.length > 0 ? target_symbols : undefined,
        labels: labels.length > 0 ? labels : undefined,
        acceptance_criteria: acceptance_criteria.length > 0 ? acceptance_criteria : undefined,
      });
      onClose();
    } catch (err) {
      console.error('Update task failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-cad-surface border border-cad-border w-full max-w-lg rounded shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="px-4 py-3 border-b border-cad-border flex items-center justify-between bg-cad-subsurface">
          <span className="font-bold text-xs flex items-center gap-1.5 text-cad-cyan">
            <Edit3 className="w-4 h-4" /> Edit Task [{task.ticket_key}]
          </span>
          <button onClick={onClose} className="text-cad-muted hover:text-cad-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3 text-xs overflow-y-auto">
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text text-xs focus:outline-none focus:border-cad-cyan"
                required
              />
            </div>
            <div className="w-20 flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="bg-cad-bg border border-cad-border rounded px-2 py-1.5 text-cad-text text-xs focus:outline-none focus:border-cad-cyan font-mono"
              >
                <option value={1}>P1</option>
                <option value={2}>P2</option>
                <option value={3}>P3</option>
                <option value={4}>P4</option>
                <option value={5}>P5</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="bg-cad-bg border border-cad-border rounded p-2 text-cad-text text-xs focus:outline-none focus:border-cad-cyan"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted">Repo</label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                className="bg-cad-bg border border-cad-border rounded px-2 py-1 text-cad-text text-xs focus:outline-none focus:border-cad-cyan font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted">Crate</label>
              <input
                type="text"
                value={crateName}
                onChange={(e) => setCrateName(e.target.value)}
                className="bg-cad-bg border border-cad-border rounded px-2 py-1 text-cad-text text-xs focus:outline-none focus:border-cad-cyan font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted">Module</label>
              <input
                type="text"
                value={modulePath}
                onChange={(e) => setModulePath(e.target.value)}
                className="bg-cad-bg border border-cad-border rounded px-2 py-1 text-cad-text text-xs focus:outline-none focus:border-cad-cyan font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted">Files (comma separated)</label>
            <input
              type="text"
              value={filesText}
              onChange={(e) => setFilesText(e.target.value)}
              className="bg-cad-bg border border-cad-border rounded px-2 py-1 text-cad-text text-xs focus:outline-none focus:border-cad-cyan font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted">Symbols (comma separated)</label>
            <input
              type="text"
              value={symbolsText}
              onChange={(e) => setSymbolsText(e.target.value)}
              className="bg-cad-bg border border-cad-border rounded px-2 py-1 text-cad-text text-xs focus:outline-none focus:border-cad-cyan font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted">Labels (comma separated)</label>
            <input
              type="text"
              value={labelsText}
              onChange={(e) => setLabelsText(e.target.value)}
              className="bg-cad-bg border border-cad-border rounded px-2 py-1 text-cad-text text-xs focus:outline-none focus:border-cad-cyan"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted">Acceptance Criteria (one per line)</label>
            <textarea
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
              rows={2}
              className="bg-cad-bg border border-cad-border rounded p-2 text-cad-text text-xs focus:outline-none focus:border-cad-cyan"
            />
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
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
