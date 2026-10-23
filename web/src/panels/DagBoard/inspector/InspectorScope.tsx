import React from 'react';
import type { TaskScope } from '../../../types';
import { AlertTriangle, Folder, FileCode, Tag, Hash } from 'lucide-react';

interface InspectorScopeProps {
  scope: TaskScope;
  collisionWarnings?: string[];
}

export const InspectorScope: React.FC<InspectorScopeProps> = ({
  scope,
  collisionWarnings = [],
}) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Scope Collision Alert */}
      {collisionWarnings.length > 0 && (
        <div className="p-3 border border-cad-amber/40 bg-cad-amber/10 rounded flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-cad-amber font-bold text-[11px]">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Scope Collision Warning</span>
          </div>
          <div className="flex flex-col gap-1">
            {collisionWarnings.map((warn, i) => (
              <span key={i} className="text-[10px] text-cad-muted font-mono leading-relaxed">
                • {warn}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scope Coordinates */}
      <div className="flex flex-col gap-2 p-3 rounded bg-cad-bg border border-cad-border">
        <span className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
          Scope Coordinates
        </span>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Folder className="w-3 h-3 text-cad-muted shrink-0" />
            <span className="text-cad-muted">Repo:</span>
            <span className="text-cad-text font-medium truncate">{scope.repo || 'root'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Folder className="w-3 h-3 text-cad-cyan shrink-0" />
            <span className="text-cad-muted">Crate:</span>
            <span className="text-cad-cyan font-mono truncate">{scope.crate_name || 'n/a'}</span>
          </div>
        </div>

        {scope.module_path && (
          <div className="flex items-center gap-1.5 text-[11px] pt-1 border-t border-cad-border/50">
            <span className="text-cad-muted">Module:</span>
            <span className="font-mono text-cad-text">{scope.module_path}</span>
          </div>
        )}

        {/* Target Files */}
        {scope.target_files && scope.target_files.length > 0 && (
          <div className="flex flex-col gap-1 pt-1.5 border-t border-cad-border/50">
            <span className="text-[10px] text-cad-muted font-semibold flex items-center gap-1">
              <FileCode className="w-3 h-3 text-cad-muted" /> Target Files
            </span>
            <div className="flex flex-col gap-1">
              {scope.target_files.map((file, i) => (
                <span
                  key={i}
                  className="font-mono text-[10px] text-cad-cyan bg-cad-surface/60 px-2 py-0.5 rounded border border-cad-border/60 truncate"
                  title={file}
                >
                  {file}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Target Symbols */}
        {scope.target_symbols && scope.target_symbols.length > 0 && (
          <div className="flex flex-col gap-1 pt-1.5 border-t border-cad-border/50">
            <span className="text-[10px] text-cad-muted font-semibold flex items-center gap-1">
              <Hash className="w-3 h-3 text-cad-muted" /> Target Symbols
            </span>
            <div className="flex flex-wrap gap-1">
              {scope.target_symbols.map((sym, i) => (
                <span
                  key={i}
                  className="font-mono text-[10px] text-cad-text bg-cad-surface px-1.5 py-0.5 rounded border border-cad-border"
                >
                  {sym}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Labels */}
        {scope.labels && scope.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1.5 border-t border-cad-border/50">
            {scope.labels.map((lbl, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-cad-surface border border-cad-border text-cad-muted"
              >
                <Tag className="w-2.5 h-2.5" />
                {lbl}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
