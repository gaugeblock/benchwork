import React, { useEffect, useState, useCallback } from 'react';
import type { SpecBundle } from '../../types';
import { api } from '../../api/client';
import { DecisionCard } from './DecisionCard';
import { ContractPreview } from './ContractPreview';
import { DocAuditChecklist } from './DocAuditChecklist';
import { FileText, CheckCircle2, ShieldAlert, BookOpen, Layers, Copy, Check } from 'lucide-react';

export const DocsSpecsPanel: React.FC = () => {
  const [bundle, setBundle] = useState<SpecBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState<string>('SPEC.md');
  const [rightMode, setRightMode] = useState<'docs' | 'decisions' | 'contracts'>('docs');
  const [copied, setCopied] = useState(false);

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

  const supportingKeys = Object.keys(bundle?.supporting_docs || {});
  const docTabs = [
    ...(bundle?.primary_spec ? ['SPEC.md'] : []),
    ...supportingKeys,
    ...(!bundle?.primary_spec && supportingKeys.length === 0 ? ['SPEC.md'] : []),
  ];

  useEffect(() => {
    if (docTabs.length > 0 && !docTabs.includes(activeDoc)) {
      setActiveDoc(docTabs[0]);
    }
  }, [docTabs, activeDoc]);

  const activeContent =
    activeDoc === 'SPEC.md'
      ? bundle?.primary_spec ||
        '# SPEC.md not found in workspace root\n\nUse the 9-Document Architecture tool on the right to scaffold SPEC.md or other architectural specifications.'
      : bundle?.supporting_docs[activeDoc] || '';

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lineCount = activeContent.split('\n').length;
  const wordCount = activeContent.trim() ? activeContent.trim().split(/\s+/).length : 0;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-cad-muted animate-pulse">
        Loading Technical Specifications & Architectural Blueprints...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-cad-bg">
      {/* Central Viewport: Markdown Architectural Document Viewer */}
      <div className="flex-1 flex flex-col border-r border-cad-border overflow-hidden">
        {/* Document Tabs Strip & Metadata Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-cad-border bg-cad-surface shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[70%] py-0.5">
            {docTabs.map((doc) => (
              <button
                key={doc}
                onClick={() => setActiveDoc(doc)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded font-medium transition-all ${
                  activeDoc === doc
                    ? 'bg-cad-cyan/20 text-cad-cyan font-bold border border-cad-cyan/40 shadow-sm'
                    : 'text-cad-muted hover:text-cad-text border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{doc}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-cad-muted">
            <span className="font-mono text-[11px]">{lineCount} lines · {wordCount} words</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded bg-cad-bg border border-cad-border hover:border-cad-cyan hover:text-cad-cyan transition-colors text-[11px]"
              title="Copy markdown content"
            >
              {copied ? <Check className="w-3 h-3 text-cad-emerald" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Markdown Monospace Proportional Viewer */}
        <div className="flex-1 p-6 overflow-y-auto font-mono text-xs text-cad-text leading-relaxed bg-cad-bg whitespace-pre-wrap select-text">
          {activeContent}
        </div>
      </div>

      {/* Right Rail: 9-Doc Architecture, Decision Holes & Shared Contracts */}
      <div className="w-full md:w-[460px] flex flex-col border-cad-border overflow-hidden bg-cad-surface/40">
        {/* Sub-Header Tabs */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-cad-border bg-cad-surface shrink-0">
          <div className="flex items-center gap-1 bg-cad-bg border border-cad-border p-0.5 rounded text-xs">
            <button
              onClick={() => setRightMode('docs')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all ${
                rightMode === 'docs'
                  ? 'bg-cad-cyan/20 text-cad-cyan border border-cad-cyan/40 shadow-sm'
                  : 'text-cad-muted hover:text-cad-text border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>9-Doc Topology</span>
            </button>
            <button
              onClick={() => setRightMode('decisions')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all ${
                rightMode === 'decisions'
                  ? 'bg-cad-amber/20 text-cad-amber border border-cad-amber/40 shadow-sm'
                  : 'text-cad-muted hover:text-cad-text border border-transparent'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Decisions ({bundle?.pending_decisions.length || 0})</span>
            </button>
            <button
              onClick={() => setRightMode('contracts')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-all ${
                rightMode === 'contracts'
                  ? 'bg-cad-cyan/20 text-cad-cyan border border-cad-cyan/40 shadow-sm'
                  : 'text-cad-muted hover:text-cad-text border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Contracts ({bundle?.contracts.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Right Tab Content Viewport */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {rightMode === 'docs' && <DocAuditChecklist />}

          {rightMode === 'decisions' && (
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
              {bundle?.pending_decisions && bundle.pending_decisions.length > 0 ? (
                bundle.pending_decisions.map((dec) => (
                  <DecisionCard key={dec.decision_id} decision={dec} onResolved={loadData} />
                ))
              ) : (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-cad-muted">
                  <CheckCircle2 className="w-6 h-6 text-cad-emerald" />
                  <span className="text-xs font-semibold">Zero unresolved architectural decisions.</span>
                  <span className="text-[10px] text-cad-borderLight">Specification invariants are locked and verified.</span>
                </div>
              )}
            </div>
          )}

          {rightMode === 'contracts' && (
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3">
              {bundle?.contracts && bundle.contracts.length > 0 ? (
                bundle.contracts.map((c) => (
                  <ContractPreview key={c.name} contract={c} />
                ))
              ) : (
                <div className="p-8 text-center text-xs text-cad-muted">
                  No SharedTypeContracts defined in specifications.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

