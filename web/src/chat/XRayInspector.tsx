import React from 'react';
import { Eye, Shield, Activity, Database, CheckCircle2 } from 'lucide-react';
import type { UiViewportContext } from './useBenchworkChat';

interface XRayInspectorProps {
  viewport: UiViewportContext;
  threadId: string;
  onClose: () => void;
}

export const XRayInspector: React.FC<XRayInspectorProps> = ({
  viewport,
  threadId,
  onClose,
}) => {
  return (
    <div className="border-b border-cad-border bg-cad-subsurface/95 p-3 text-xs font-mono space-y-2.5">
      <div className="flex items-center justify-between border-b border-cad-border/50 pb-1.5">
        <div className="flex items-center gap-1.5 text-cad-cyan font-bold uppercase tracking-wider">
          <Eye className="w-3.5 h-3.5" />
          <span>Turn Context Radar (X-Ray)</span>
        </div>
        <button
          onClick={onClose}
          className="text-cad-muted hover:text-cad-text text-[11px] px-1.5 py-0.5 rounded border border-cad-border"
          type="button"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-cad-surface p-2 rounded border border-cad-border/60">
          <span className="text-cad-muted block mb-0.5 flex items-center gap-1">
            <Activity className="w-3 h-3 text-cad-yellow" /> Active Viewport
          </span>
          <div className="font-semibold text-cad-text">{viewport.active_panel}</div>
          {viewport.focused_task_key && (
            <div className="text-cad-cyan mt-1">Focused: {viewport.focused_task_key}</div>
          )}
        </div>

        <div className="bg-cad-surface p-2 rounded border border-cad-border/60">
          <span className="text-cad-muted block mb-0.5 flex items-center gap-1">
            <Database className="w-3 h-3 text-cad-green" /> Chat Session
          </span>
          <div className="truncate text-cad-text">{threadId}</div>
          <div className="text-cad-green flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> Synchronized
          </div>
        </div>
      </div>

      <div className="bg-cad-bg p-2 rounded border border-cad-border/40 text-[10px] text-cad-muted space-y-1">
        <div className="text-cad-cyan font-semibold flex items-center gap-1">
          <Shield className="w-3 h-3" /> Injected &lt;gaugeblock_environment&gt; Envelopes
        </div>
        <div>• Pinned Session Identity: 9-Doc Matrix SoC &amp; AGENTS.md Laws</div>
        <div>• Per-Turn Envelope: Bounded strictly to ~200-250 tokens</div>
        <div>• Telemetry Spool: Automatic Silver SFT / Gold DPO distillation</div>
      </div>
    </div>
  );
};

