import React, { useEffect, useState, useCallback } from 'react';
import type { SpecBundle, TaskNode } from '../../types';
import { api } from '../../api/client';
import { DecisionCard } from './DecisionCard';
import { ContractPreview } from './ContractPreview';
import { FileText, CheckCircle2, ShieldAlert, MessageSquare } from 'lucide-react';

interface GrillStudioPanelProps {
  initialChatTask?: TaskNode | null;
}

export const GrillStudioPanel: React.FC<GrillStudioPanelProps> = ({ initialChatTask }) => {
  const [bundle, setBundle] = useState<SpecBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState<string>('SPEC.md');

  const loadData = useCallback(async () => {
    try {
      const data = await api.getSpec();
      setBundle(data);
    } catch (err) {
      console.error('Failed loading spec bundle:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-cad-muted animate-pulse">
        Loading Technical Specifications & /grill-me Studio...
      </div>
    );
  }

  const docTabs = ['SPEC.md', ...Object.keys(bundle?.supporting_docs || {})];
  const activeContent =
    activeDoc === 'SPEC.md'
      ? bundle?.primary_spec || '# SPEC.md not found in workspace root\n'
      : bundle?.supporting_docs[activeDoc] || '';

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-cad-bg">
      {/* Left: Spec Document Viewport */}
      <div className="flex-1 flex flex-col border-r border-cad-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-cad-border bg-cad-surface">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cad-cyan" />
            <span className="text-xs font-bold text-cad-text uppercase tracking-wider">
              Technical Documentation
            </span>
          </div>

          <div className="flex items-center gap-1">
            {docTabs.map((doc) => (
              <button
                key={doc}
                onClick={() => setActiveDoc(doc)}
                className={`text-[11px] px-2.5 py-1 rounded transition-colors ${
                  activeDoc === doc
                    ? 'bg-cad-cyan/20 text-cad-cyan font-bold border border-cad-cyan/40'
                    : 'text-cad-muted hover:text-cad-text border border-transparent'
                }`}
              >
                {doc}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-cad-text leading-relaxed bg-cad-bg whitespace-pre-wrap">
          {activeContent}
        </div>
      </div>

      {/* Right: Decision Holes & Shared Type Contracts */}
      <div className="w-full md:w-[480px] flex flex-col border-cad-border overflow-hidden bg-cad-surface/40">
        {/* Top: Decisions Studio */}
        <div className="flex-1 flex flex-col border-b border-cad-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-cad-border bg-cad-surface">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cad-amber" />
              <span className="text-xs font-bold text-cad-text uppercase tracking-wider">
                /grill-me Decision Holes
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-cad-amber/30 bg-cad-amber/10 text-cad-amber font-semibold">
              {bundle?.pending_decisions.length || 0} Pending
            </span>
          </div>

          {initialChatTask && (
            <div className="p-3 bg-cad-cyan/10 border-b border-cad-cyan/30 flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-cad-cyan shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-cad-cyan">{initialChatTask.ticket_key}</span>
                  <span className="font-semibold text-cad-text">{initialChatTask.title}</span>
                </div>
                <span className="text-[11px] text-cad-muted">
                  Focusing discussion and decisions on this ticket.
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
            {bundle?.pending_decisions && bundle.pending_decisions.length > 0 ? (
              bundle.pending_decisions.map((dec) => (
                <DecisionCard key={dec.decision_id} decision={dec} onResolved={loadData} />
              ))
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-cad-muted">
                <CheckCircle2 className="w-6 h-6 text-cad-emerald" />
                <span className="text-xs">Zero unresolved ambiguity holes in scope.</span>
                <span className="text-[10px] text-cad-borderLight">Specification is locked and ready for DAG compilation.</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Polyglot Shared Type Contracts */}
        <div className="h-[280px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-cad-border bg-cad-surface">
            <span className="text-xs font-bold text-cad-text uppercase tracking-wider">
              Shared Type Contracts (dado)
            </span>
            <span className="text-[10px] text-cad-muted">
              {bundle?.contracts.length || 0} Contracts
            </span>
          </div>

          <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
            {bundle?.contracts && bundle.contracts.length > 0 ? (
              bundle.contracts.map((c) => (
                <ContractPreview key={c.name} contract={c} />
              ))
            ) : (
              <div className="p-6 text-center text-xs text-cad-muted">
                No SharedTypeContracts defined in specs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
