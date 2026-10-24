import React, { useEffect, useState, useCallback } from 'react';
import type { ModelHubStatus, UniversalModelConfig } from '../../types';
import { api } from '../../api/client';
import { SpoolTraceTable } from './SpoolTraceTable';
import { UniversalConfigModal } from './UniversalConfigModal';
import { Cpu, Send, Zap, Radio, Sliders, Database } from 'lucide-react';

export const ModelHubPanel: React.FC = () => {
  const [hubStatus, setHubStatus] = useState<ModelHubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('planner');
  const [pingPrompt, setPingPrompt] = useState('ping status');
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ text: string; latency_ms: number; model: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'router' | 'spool'>('router');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [universalConfig, setUniversalConfig] = useState<UniversalModelConfig | null>(null);

  const loadHub = useCallback(async () => {
    try {
      const data = await api.getHubStatus();
      setHubStatus(data);
      const cfg = await api.getHubConfig();
      setUniversalConfig(cfg);
    } catch (err) {
      console.error('Failed loading model hub:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHub();
  }, [loadHub]);

  const handlePing = async () => {
    if (!pingPrompt.trim()) return;
    setPinging(true);
    try {
      const res = await api.pingModel(selectedRole, pingPrompt.trim());
      setPingResult({
        text: res.text,
        latency_ms: res.latency_ms,
        model: res.model_used,
      });
    } catch (err) {
      setPingResult({
        text: `Ping failed: ${err}`,
        latency_ms: 0,
        model: 'error',
      });
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-cad-bg">
      {/* Top Navigation & Sub-Tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cad-border bg-cad-surface shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('router')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'router'
                ? 'bg-cad-cyan/20 text-cad-cyan border border-cad-cyan/40'
                : 'text-cad-muted hover:text-cad-text'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Model Router & Universal API</span>
          </button>
          <button
            onClick={() => setActiveTab('spool')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded transition-colors ${
              activeTab === 'spool'
                ? 'bg-cad-cyan/20 text-cad-cyan border border-cad-cyan/40'
                : 'text-cad-muted hover:text-cad-text'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Telemetry Spool ({hubStatus?.spool_traces.length || 0})</span>
          </button>
        </div>

        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cad-cyan text-black font-semibold text-xs hover:bg-cad-cyan/90 transition-all shadow-sm"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Configure Universal API (sawhorse.toml)</span>
        </button>
      </div>

      {activeTab === 'router' ? (
        <div className="p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Universal Fallback Info Card */}
          {universalConfig && (
            <div className="p-3 bg-cad-surface/90 border border-cad-border rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-cad-cyan" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-cad-text">
                    Active Universal Mode: {universalConfig.use_universal_fallback ? 'Single-Model Fallback' : 'Multi-Provider'}
                  </span>
                  <span className="text-[11px] text-cad-muted font-mono">
                    Provider: {universalConfig.provider} • Model: {universalConfig.model_name}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(true)}
                className="text-[11px] text-cad-cyan hover:underline"
              >
                Change in sawhorse.toml
              </button>
            </div>
          )}

          {/* Roles Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {hubStatus?.roles &&
              Object.entries(hubStatus.roles).map(([role, modeStr]) => (
                <div
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`p-3 rounded border transition-colors cursor-pointer flex flex-col gap-1 ${
                    selectedRole === role
                      ? 'border-cad-cyan bg-cad-cyan/15 text-cad-cyan'
                      : 'border-cad-border bg-cad-surface text-cad-text hover:border-cad-borderLight'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase">{role}</span>
                    <Cpu className="w-3.5 h-3.5 opacity-60" />
                  </div>
                  <span className="text-[10px] text-cad-muted truncate font-mono">
                    {modeStr}
                  </span>
                </div>
              ))}
          </div>

          {/* Test Inference Ping Interactive Bar */}
          <div className="flex flex-col md:flex-row items-center gap-2 pt-2">
            <div className="flex-1 flex items-center gap-2 bg-cad-surface border border-cad-border rounded px-3 py-2 w-full">
              <Zap className="w-3.5 h-3.5 text-cad-amber shrink-0" />
              <span className="text-[10px] text-cad-muted uppercase font-bold shrink-0">
                Ping [{selectedRole}]:
              </span>
              <input
                type="text"
                value={pingPrompt}
                onChange={(e) => setPingPrompt(e.target.value)}
                placeholder="Test prompt..."
                className="bg-transparent text-xs text-cad-text focus:outline-none w-full font-mono"
              />
              <button
                disabled={pinging}
                onClick={handlePing}
                className="px-3 py-1 bg-cad-cyan/20 border border-cad-cyan text-cad-cyan hover:bg-cad-cyan/30 rounded text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
              >
                <Send className="w-3 h-3" />
                {pinging ? 'Pinging...' : 'Send Ping'}
              </button>
            </div>

            {pingResult && (
              <div className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded bg-cad-surface border border-cad-border shrink-0">
                <span className="text-cad-cyan">{pingResult.model}</span>
                <span className="text-cad-muted">({pingResult.latency_ms}ms):</span>
                <span className="text-cad-text truncate max-w-xs">{pingResult.text}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-cad-muted animate-pulse">
              Loading Telemetry Spool...
            </div>
          ) : (
            <SpoolTraceTable
              traces={hubStatus?.spool_traces || []}
              onRefresh={loadHub}
            />
          )}
        </div>
      )}

      {universalConfig && (
        <UniversalConfigModal
          config={universalConfig}
          isOpen={showConfigModal}
          onClose={() => setShowConfigModal(false)}
          onSaved={(newCfg) => {
            setUniversalConfig(newCfg);
            loadHub();
          }}
        />
      )}
    </div>
  );
};
