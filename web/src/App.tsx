import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import { useLiveStream } from './api/useLiveStream';
import type { WorkspaceCapabilities, LiveEvent, TaskNode } from './types';
import { GrillStudioPanel } from './panels/GrillStudio/GrillStudioPanel';
import { DagBoardPanel } from './panels/DagBoard/DagBoardPanel';
import { SynthesisXrayPanel } from './panels/SynthesisXray/SynthesisXrayPanel';
import { ModelHubPanel } from './panels/ModelTelemetryHub/ModelHubPanel';
import {
  FileText,
  Network,
  Cpu,
  Radio,
  Boxes,
  Layers,
  Database,
  Activity,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'spec' | 'dag' | 'xray' | 'hub'>('dag');
  const [capabilities, setCapabilities] = useState<WorkspaceCapabilities | null>(null);
  const [activeChatTask, setActiveChatTask] = useState<TaskNode | null>(null);

  const handleDiscussInChat = (task: TaskNode) => {
    setActiveChatTask(task);
    setActiveTab('spec');
  };

  const loadCapabilities = useCallback(async () => {
    try {
      const caps = await api.getCapabilities();
      setCapabilities(caps);
    } catch (err) {
      console.error('Failed fetching capabilities:', err);
    }
  }, []);

  const handleLiveEvent = useCallback((event: LiveEvent) => {
    if (event.type === 'task_updated' || event.type === 'decision_resolved') {
      loadCapabilities();
    }
  }, [loadCapabilities]);

  const { connected } = useLiveStream(handleLiveEvent);

  useEffect(() => {
    loadCapabilities();
  }, [loadCapabilities]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-cad-bg text-cad-text">
      {/* Precision CAD Header & Capability Status Bar */}
      <header className="h-12 border-b border-cad-border bg-cad-surface flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-cad-cyan" />
            <span className="font-bold text-sm tracking-widest text-cad-text uppercase">
              benchwork
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cad-bg border border-cad-border text-cad-cyan font-mono">
              v0.1.0-beta.2
            </span>
          </div>

          <div className="h-4 w-px bg-cad-border" />

          {/* Capability Badges */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border ${
              capabilities?.spec_docs.primary_spec_present
                ? 'border-cad-emerald/40 text-cad-emerald bg-cad-emerald/10'
                : 'border-cad-border text-cad-muted bg-cad-bg'
            }`}>
              <FileText className="w-3 h-3" />
              SPEC.md
            </span>

            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border ${
              capabilities?.storypole_active
                ? 'border-cad-emerald/40 text-cad-emerald bg-cad-emerald/10'
                : 'border-cad-border text-cad-muted bg-cad-bg'
            }`}>
              <Network className="w-3 h-3" />
              Storypole ({capabilities?.pending_decisions_count || 0} dec)
            </span>

            <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-cad-border text-cad-muted bg-cad-bg">
              <Layers className="w-3 h-3 text-cad-cyan" />
              {capabilities?.dado_patterns_count || 0} Dado
            </span>

            <span className={`flex items-center gap-1 px-2 py-0.5 rounded border ${
              capabilities?.sawhorse_configured
                ? 'border-cad-emerald/40 text-cad-emerald bg-cad-emerald/10'
                : 'border-cad-border text-cad-muted bg-cad-bg'
            }`}>
              <Cpu className="w-3 h-3" />
              Sawhorse
            </span>

            <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-cad-border text-cad-muted bg-cad-bg">
              <Database className="w-3 h-3 text-cad-amber" />
              {capabilities?.pending_telemetry_count || 0} Rabbet Spool
            </span>
          </div>
        </div>

        {/* Live Event Stream Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-cad-bg border border-cad-border">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-cad-emerald animate-pulse' : 'bg-cad-crimson'}`} />
            <span className="text-[10px] text-cad-muted">{connected ? 'LIVE AGGREGATOR' : 'OFFLINE'}</span>
          </span>
        </div>
      </header>

      {/* 4-Panel Navigation Tabs */}
      <nav className="h-9 border-b border-cad-border bg-cad-subsurface/40 flex items-center px-4 gap-1 shrink-0">
        <button
          onClick={() => setActiveTab('spec')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-t transition-colors ${
            activeTab === 'spec'
              ? 'bg-cad-bg text-cad-cyan border-t-2 border-cad-cyan'
              : 'text-cad-muted hover:text-cad-text'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Panel 1: Spec & /grill-me Studio
        </button>

        <button
          onClick={() => setActiveTab('dag')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-t transition-colors ${
            activeTab === 'dag'
              ? 'bg-cad-bg text-cad-cyan border-t-2 border-cad-cyan'
              : 'text-cad-muted hover:text-cad-text'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          Panel 2: Backlog & Live DAG Board
        </button>

        <button
          onClick={() => setActiveTab('xray')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-t transition-colors ${
            activeTab === 'xray'
              ? 'bg-cad-bg text-cad-cyan border-t-2 border-cad-cyan'
              : 'text-cad-muted hover:text-cad-text'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Panel 3: AST & Synthesis X-Ray
        </button>

        <button
          onClick={() => setActiveTab('hub')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-t transition-colors ${
            activeTab === 'hub'
              ? 'bg-cad-bg text-cad-cyan border-t-2 border-cad-cyan'
              : 'text-cad-muted hover:text-cad-text'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          Panel 4: Model Router & Telemetry Spool
        </button>
      </nav>

      {/* Active Panel Viewport */}
      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'spec' && <GrillStudioPanel initialChatTask={activeChatTask} />}
        {activeTab === 'dag' && <DagBoardPanel onDiscussInChat={handleDiscussInChat} />}
        {activeTab === 'xray' && <SynthesisXrayPanel />}
        {activeTab === 'hub' && <ModelHubPanel />}
      </main>
    </div>
  );
};

export default App;
