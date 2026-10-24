import React, { useState, useEffect, useCallback } from 'react';
import { docsApi } from '../../api/docsClient';
import type { DocAuditReport, DocAuditItem } from '../../types/docs';
import { DocArchitectureModal } from './DocArchitectureModal';
import {
  FileCheck2,
  FileQuestion,
  FileWarning,
  Settings,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react';

export const DocAuditChecklist: React.FC = () => {
  const [report, setReport] = useState<DocAuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [scaffolding, setScaffolding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const data = await docsApi.getDocsAudit();
      setReport(data);
    } catch (err) {
      console.error('Failed fetching doc audit report:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const handleScaffold = async (docType?: string) => {
    setScaffolding(true);
    try {
      await docsApi.scaffoldDocs(docType, false);
      await fetchAudit();
    } catch (err) {
      console.error('Failed scaffolding docs:', err);
    } finally {
      setScaffolding(false);
    }
  };

  const getStatusBadge = (item: DocAuditItem) => {
    switch (item.status) {
      case 'present':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border border-cad-emerald/30 bg-cad-emerald/10 text-cad-emerald">
            <FileCheck2 className="w-3 h-3" /> Present
          </span>
        );
      case 'missing':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border border-cad-amber/30 bg-cad-amber/10 text-cad-amber">
            <FileQuestion className="w-3 h-3" /> Missing
          </span>
        );
      case 'drifted':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400">
            <FileWarning className="w-3 h-3" /> Drifted
          </span>
        );
    }
  };

  const missingCount = report?.items.filter((i) => i.status === 'missing').length || 0;
  const driftedCount = report?.items.filter((i) => i.status === 'drifted').length || 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-cad-bg">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cad-border bg-cad-surface shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-cad-text">
            9-Document Topology
          </span>
          <span className="text-[10px] font-mono text-cad-muted">
            {report?.items.length || 0} Docs ({missingCount} missing, {driftedCount} drifted)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleScaffold()}
            disabled={scaffolding || missingCount === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cad-cyan/20 border border-cad-cyan/40 text-[11px] font-semibold text-cad-cyan hover:bg-cad-cyan/30 disabled:opacity-40"
          >
            <Sparkles className="w-3 h-3" />
            <span>{scaffolding ? 'Scaffolding...' : 'Scaffold Missing'}</span>
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1 rounded hover:bg-cad-surfaceLight text-cad-muted hover:text-cad-text border border-cad-border"
            title="Configure .gaugeblock/docs.toml"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fetchAudit}
            disabled={loading}
            className="p-1 rounded hover:bg-cad-surfaceLight text-cad-muted hover:text-cad-text border border-cad-border"
            title="Refresh Audit"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Checklist Viewport */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2">
        {report?.items.map((item) => (
          <div
            key={item.doc_type}
            className="p-2.5 rounded border border-cad-border bg-cad-surface flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cad-text uppercase">
                  {item.doc_type}
                </span>
                <span className="font-mono text-[11px] text-cad-muted">{item.path}</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(item)}
                {item.status !== 'present' && (
                  <button
                    onClick={() => handleScaffold(item.doc_type)}
                    className="p-1 rounded bg-cad-bg hover:bg-cad-surfaceLight text-cad-cyan border border-cad-border text-[10px] flex items-center gap-0.5"
                    title={`Scaffold ${item.path}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {item.violations.length > 0 && (
              <div className="mt-1 pt-1.5 border-t border-cad-border/50 flex flex-col gap-1">
                {item.violations.map((v, idx) => (
                  <span key={idx} className="text-[10px] text-purple-400 font-mono">
                    * {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <DocArchitectureModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={fetchAudit}
      />
    </div>
  );
};
