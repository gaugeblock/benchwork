import React, { useEffect, useState, useCallback } from 'react';
import type { DadoPattern, TypedHole } from '../../types';
import { api } from '../../api/client';
import { PatternHolesView } from './PatternHolesView';
import { GrammarAndStream } from './GrammarAndStream';
import { useLiveStream } from '../../api/useLiveStream';
import { Search, BookOpen, Activity, ArrowRight } from 'lucide-react';

export const SynthesisXrayPanel: React.FC = () => {
  const [patterns, setPatterns] = useState<DadoPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<DadoPattern | null>(null);
  const [selectedHole, setSelectedHole] = useState<TypedHole | null>(null);
  const [search, setSearch] = useState('');
  const [liveLogs, setLiveLogs] = useState<{ step: string; detail: string; timestamp: number }[]>([]);

  const loadPatterns = useCallback(async () => {
    try {
      const data = await api.getPatterns();
      setPatterns(data);
      if (data.length > 0 && !selectedPattern) {
        setSelectedPattern(data[0]);
        if (data[0].holes.length > 0) {
          setSelectedHole(data[0].holes[0]);
        }
      }
    } catch (err) {
      console.error('Failed loading Dado patterns:', err);
    }
  }, [selectedPattern]);

  useEffect(() => {
    loadPatterns();
  }, [loadPatterns]);

  useLiveStream((event) => {
    if (event.type === 'synthesis_step') {
      setLiveLogs((prev) => [
        ...prev,
        {
          step: event.payload.step || 'Step',
          detail: event.payload.detail || '',
          timestamp: Date.now(),
        },
      ]);
    } else if (event.type === 'synthesis_completed') {
      setLiveLogs((prev) => [
        ...prev,
        {
          step: event.payload.success ? 'Verified' : 'Failed',
          detail: `Synthesis completed. Success=${event.payload.success} (${event.payload.tier || ''})`,
          timestamp: Date.now(),
        },
      ]);
    }
  });

  const filtered = patterns.filter(
    (p) =>
      p.pattern_id.toLowerCase().includes(search.toLowerCase()) ||
      p.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cad-bg">
      {/* Educational Neurosymbolic Header Banner */}
      <div className="px-4 py-2.5 border-b border-cad-border bg-cad-surface flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-cad-cyan/15 text-cad-cyan border border-cad-cyan/30">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-cad-text uppercase tracking-wider">
                Neurosymbolic AST X-Ray & Grammar Studio
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                dado + batten + joiner
              </span>
            </div>
            <p className="text-[11px] text-cad-muted leading-tight">
              Inspect deterministic AST pattern skeletons, typed hole contracts, and real-time CFG grammar sampling constraints.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cad-bg border border-cad-border text-cad-muted text-[11px]">
            <Activity className="w-3.5 h-3.5 text-cad-emerald animate-pulse" />
            <span>Telemetry Listener Active</span>
          </div>
          <span className="text-[11px] text-cad-muted flex items-center gap-1">
            <span>Synthesis Triggers:</span>
            <span className="font-semibold text-cad-cyan flex items-center gap-0.5">
              Panel 2 Backlog <ArrowRight className="w-3 h-3 inline" />
            </span>
          </span>
        </div>
      </div>

      {/* Main 3-Column Inspection Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Pattern Catalog */}
        <div className="w-64 border-r border-cad-border flex flex-col bg-cad-surface/30 shrink-0">
          <div className="p-2 border-b border-cad-border flex items-center gap-1.5 bg-cad-surface">
            <Search className="w-3.5 h-3.5 text-cad-muted" />
            <input
              type="text"
              placeholder="Filter patterns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-xs text-cad-text focus:outline-none w-full"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
            {filtered.map((pat) => {
              const isSelected = selectedPattern?.pattern_id === pat.pattern_id;
              return (
                <button
                  key={pat.pattern_id}
                  onClick={() => {
                    setSelectedPattern(pat);
                    setSelectedHole(pat.holes[0] || null);
                  }}
                  className={`text-left p-2 rounded border transition-colors flex flex-col gap-0.5 ${
                    isSelected
                      ? 'border-cad-cyan bg-cad-cyan/15 text-cad-cyan font-bold'
                      : 'border-cad-border/60 bg-cad-surface hover:border-cad-borderLight text-cad-text'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span>{pat.pattern_id}</span>
                    <span className="text-[10px] font-normal text-cad-muted">{pat.language}</span>
                  </div>
                  <span className="text-[10px] text-cad-muted truncate font-normal">
                    {pat.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Template & Typed Holes */}
        <div className="w-[450px] border-r border-cad-border flex flex-col overflow-hidden shrink-0">
          <PatternHolesView
            pattern={selectedPattern}
            selectedHole={selectedHole}
            onSelectHole={(hole) => setSelectedHole(hole)}
          />
        </div>

        {/* Column 3: Batten Grammar & Live Stream */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <GrammarAndStream
            pattern={selectedPattern}
            hole={selectedHole}
            liveLogs={liveLogs}
          />
        </div>
      </div>
    </div>
  );
};
