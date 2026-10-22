import React from 'react';
import type { DadoPattern, TypedHole } from '../../types';
import { Layers, Tag, Code } from 'lucide-react';

interface PatternHolesViewProps {
  pattern: DadoPattern | null;
  selectedHole: TypedHole | null;
  onSelectHole: (hole: TypedHole) => void;
}

export const PatternHolesView: React.FC<PatternHolesViewProps> = ({
  pattern,
  selectedHole,
  onSelectHole,
}) => {
  if (!pattern) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-cad-muted p-6">
        Select a Dado AST pattern to inspect template source and typed holes.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cad-bg">
      {/* Pattern Header */}
      <div className="p-3 border-b border-cad-border bg-cad-surface/60 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cad-cyan" />
            <span className="text-xs font-bold text-cad-text uppercase">
              {pattern.pattern_id}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-cad-bg border border-cad-border text-cad-cyan font-mono">
            {pattern.language} • {pattern.domain}
          </span>
        </div>
        <p className="text-[11px] text-cad-muted leading-tight">{pattern.description}</p>
      </div>

      {/* Typed Holes Bar */}
      <div className="p-2.5 border-b border-cad-border bg-cad-surface/30 flex flex-col gap-1.5">
        <span className="text-[10px] uppercase font-bold text-cad-muted flex items-center gap-1">
          <Tag className="w-3 h-3 text-cad-amber" />
          Interactive Typed Holes ({pattern.holes.length}):
        </span>

        <div className="flex flex-wrap gap-1.5">
          {pattern.holes.map((hole) => {
            const isSelected = selectedHole?.hole_id === hole.hole_id;
            return (
              <button
                key={hole.hole_id}
                onClick={() => onSelectHole(hole)}
                className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-cad-amber bg-cad-amber/20 text-cad-amber font-semibold'
                    : 'border-cad-border bg-cad-bg text-cad-text hover:border-cad-borderLight'
                }`}
              >
                <span>?[{hole.hole_id}: {hole.expected_type}]</span>
                <span className="text-[9px] px-1 py-0.2 bg-cad-surface rounded text-cad-muted">
                  {hole.kind}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Source Viewport */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs text-cad-text leading-relaxed bg-cad-bg">
        <div className="flex items-center gap-1.5 text-[10px] text-cad-muted mb-2">
          <Code className="w-3.5 h-3.5 text-cad-cyan" />
          <span>AST Template Splicing Source:</span>
        </div>
        <pre className="p-3 bg-cad-surface/50 border border-cad-border rounded text-[11px] whitespace-pre-wrap">
          {pattern.template_source}
        </pre>
      </div>
    </div>
  );
};
