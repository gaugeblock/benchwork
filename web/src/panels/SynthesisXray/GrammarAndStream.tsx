import React, { useEffect, useState } from 'react';
import type { DadoPattern, TypedHole, HoleCompileResponse } from '../../types';
import { api } from '../../api/client';
import { Terminal, Shield, Sparkles } from 'lucide-react';

interface GrammarAndStreamProps {
  pattern: DadoPattern | null;
  hole: TypedHole | null;
  liveLogs: { step: string; detail: string; timestamp: number }[];
}

export const GrammarAndStream: React.FC<GrammarAndStreamProps> = ({
  pattern,
  hole,
  liveLogs,
}) => {
  const [format, setFormat] = useState<'gbnf' | 'lark' | 'regex'>('gbnf');
  const [compiled, setCompiled] = useState<HoleCompileResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pattern || !hole) return;
    let mounted = true;
    setLoading(true);
    api.compileHole({
      pattern_id: pattern.pattern_id,
      hole_id: hole.hole_id,
      format,
    })
      .then((data) => {
        if (mounted) setCompiled(data);
      })
      .catch((err) => console.error('Failed compiling hole grammar:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [pattern, hole, format]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cad-bg">
      {/* Top: Batten Grammar Compiler Viewport */}
      <div className="h-[300px] flex flex-col border-b border-cad-border overflow-hidden bg-cad-surface/30">
        <div className="p-2.5 border-b border-cad-border bg-cad-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-cad-cyan" />
            <span className="text-xs font-bold text-cad-text uppercase">
              Batten Grammar Mask
            </span>
            {hole && (
              <span className="text-[10px] text-cad-amber">
                ({hole.hole_id} : {hole.expected_type})
              </span>
            )}
          </div>

          <div className="flex bg-cad-bg border border-cad-border rounded p-0.5 text-[11px]">
            {(['gbnf', 'lark', 'regex'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
                className={`px-2 py-0.5 rounded uppercase font-semibold transition-colors ${
                  format === fmt
                    ? 'bg-cad-cyan/20 text-cad-cyan'
                    : 'text-cad-muted hover:text-cad-text'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-cad-muted animate-pulse">
            Compiling {format.toUpperCase()} token constraint mask...
          </div>
        ) : compiled ? (
          <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-cad-muted">Allowed Identifiers:</span>
              {compiled.allowed_identifiers.map((ident) => (
                <span
                  key={ident}
                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cad-bg border border-cad-border text-cad-cyan"
                >
                  {ident}
                </span>
              ))}
            </div>

            <pre className="flex-1 p-2.5 bg-cad-bg border border-cad-border rounded font-mono text-[11px] text-cad-text overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {compiled.grammar_definition}
            </pre>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-cad-muted p-4">
            Select a typed hole above to view compiled grammar constraints.
          </div>
        )}
      </div>

      {/* Bottom: Live Joiner Event Log Stream */}
      <div className="flex-1 flex flex-col overflow-hidden bg-cad-surface/20">
        <div className="p-2.5 border-b border-cad-border bg-cad-surface flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cad-emerald" />
            <span className="text-xs font-bold text-cad-text uppercase">
              Live Joiner Synthesis Stream
            </span>
          </div>
          <span className="text-[10px] text-cad-muted">{liveLogs.length} events</span>
        </div>

        <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-1.5 font-mono text-[11px]">
          {liveLogs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-cad-muted">
              <Sparkles className="w-5 h-5 text-cad-cyan/50" />
              <span>No active synthesis runs. Trigger a task to stream live execution steps.</span>
            </div>
          ) : (
            liveLogs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 p-1.5 rounded bg-cad-bg/60 border border-cad-border/50">
                <span className="text-[9px] text-cad-muted mt-0.5 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 border border-cad-cyan/30 text-cad-cyan bg-cad-cyan/10">
                  {log.step}
                </span>
                <span className="text-cad-text leading-tight">{log.detail}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
