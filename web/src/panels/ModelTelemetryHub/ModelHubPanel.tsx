import React, { useEffect, useState, useCallback } from 'react';
import type { ModelHubStatus } from '../../types';
import { api } from '../../api/client';
import { SpoolTraceTable } from './SpoolTraceTable';
import { Cpu, Send, Zap, Radio } from 'lucide-react';

export const ModelHubPanel: React.FC = () => {
  const [hubStatus, setHubStatus] = useState<ModelHubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('planner');
  const [pingPrompt, setPingPrompt] = useState('ping status');
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ text: string; latency_ms: number; model: string } | null>(null);

  const loadHub = useCallback(async () => {
    try {
      const data = await api.getHubStatus();
      setHubStatus(data);
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
      {/* Top: Sawhorse 3-Mode Model Router Matrix */}
      <div className="p-4 border-b border-cad-border bg-cad-surface/60 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cad-cyan" />
            <span className="text-xs font-bold text-cad-text uppercase tracking-wider">
              Sawhorse 3-Mode Semantic Role Router
            </span>
          </div>
          <span className="text-[10px] text-cad-muted">
            Mode 1 (Candle) • Mode 2 (Local GGUF) • Mode 3 (OpenAI-Compat)
          </span>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {hubStatus?.roles &&
            Object.entries(hubStatus.roles).map(([role, modeStr]) => (
              <div
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`p-2.5 rounded border transition-colors cursor-pointer flex flex-col gap-1 ${
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
        <div className="flex flex-col md:flex-row items-center gap-2 pt-1">
          <div className="flex-1 flex items-center gap-2 bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 w-full">
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
              className="px-2.5 py-0.5 bg-cad-cyan/20 border border-cad-cyan text-cad-cyan hover:bg-cad-cyan/30 rounded text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
            >
              <Send className="w-3 h-3" />
              {pinging ? 'Pinging...' : 'Send'}
            </button>
          </div>

          {pingResult && (
            <div className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded bg-cad-bg border border-cad-border shrink-0">
              <span className="text-cad-cyan">{pingResult.model}</span>
              <span className="text-cad-muted">({pingResult.latency_ms}ms):</span>
              <span className="text-cad-text truncate max-w-xs">{pingResult.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Rabbet Telemetry Spool Outbox */}
      <div className="flex-1 flex overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-cad-muted animate-pulse">
            Loading Model Hub & Rabbet Telemetry Spool...
          </div>
        ) : (
          <SpoolTraceTable
            traces={hubStatus?.spool_traces || []}
            onRefresh={loadHub}
          />
        )}
      </div>
    </div>
  );
};
