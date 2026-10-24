import React, { useState } from 'react';
import type { UniversalModelConfig, TestInferenceReceipt } from '../../types';
import { api } from '../../api/client';
import { Cpu, ShieldCheck, Activity, Save, ChevronDown, ChevronRight, X, AlertCircle } from 'lucide-react';

interface UniversalConfigModalProps {
  config: UniversalModelConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (cfg: UniversalModelConfig) => void;
}

const PROVIDER_PRESETS: Record<string, { mode: string; baseUrl: string; env: string; model: string }> = {
  DeepSeek: { mode: 'openai_compatible', baseUrl: 'https://api.deepseek.com/v1', env: 'DEEPSEEK_API_KEY', model: 'deepseek-coder' },
  Anthropic: { mode: 'openai_compatible', baseUrl: 'https://api.anthropic.com/v1', env: 'ANTHROPIC_API_KEY', model: 'claude-3-5-sonnet-20241022' },
  OpenAI: { mode: 'openai_compatible', baseUrl: 'https://api.openai.com/v1', env: 'OPENAI_API_KEY', model: 'gpt-4o' },
  'Google Gemini': { mode: 'openai_compatible', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/', env: 'GEMINI_API_KEY', model: 'gemini-1.5-pro' },
  'Ollama / Local GGUF': { mode: 'local_runtime', baseUrl: 'http://127.0.0.1:11434', env: '', model: 'qwen2.5-coder:7b' },
  'In-House Candle': { mode: 'in_house_candle', baseUrl: 'weights.safetensors', env: '', model: 'candle-micro-router' },
};

export const UniversalConfigModal: React.FC<UniversalConfigModalProps> = ({
  config: initialConfig,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<UniversalModelConfig>(initialConfig);
  const [showOverrides, setShowOverrides] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testReceipt, setTestReceipt] = useState<TestInferenceReceipt | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleProviderChange = (provider: string) => {
    const preset = PROVIDER_PRESETS[provider];
    if (preset) {
      setConfig((prev) => ({
        ...prev,
        provider,
        mode: preset.mode,
        base_url: preset.baseUrl,
        api_key_env: preset.env || undefined,
        model_name: preset.model,
      }));
    } else {
      setConfig((prev) => ({ ...prev, provider }));
    }
  };

  const handleTestInference = async () => {
    setTesting(true);
    setTestReceipt(null);
    try {
      const receipt = await api.testInference({
        provider: config.provider,
        model_name: config.model_name,
        base_url: config.base_url,
        api_key_env: config.api_key_env,
        mode: config.mode,
      });
      setTestReceipt(receipt);
    } catch (err: any) {
      setTestReceipt({
        success: false,
        latency_ms: 0,
        model_used: config.model_name,
        message: err.message || 'Inference test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveHubConfig(config);
      onSaved(config);
      onClose();
    } catch (err: any) {
      alert(`Failed to save sawhorse.toml: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-cad-surface border border-cad-border rounded-lg shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden text-xs">
        <div className="flex items-center justify-between p-3.5 border-b border-cad-border bg-cad-bg/50">
          <div className="flex items-center gap-2 font-bold text-cad-text">
            <Cpu className="w-4 h-4 text-cad-cyan" />
            <span>Universal API & Model Configuration (sawhorse.toml)</span>
          </div>
          <button onClick={onClose} className="text-cad-muted hover:text-cad-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-cad-bg p-2.5 rounded border border-cad-border">
            <input
              type="checkbox"
              checked={config.use_universal_fallback}
              onChange={(e) => setConfig({ ...config, use_universal_fallback: e.target.checked })}
              className="rounded bg-cad-bg border-cad-border text-cad-cyan focus:ring-0"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-cad-text">Universal Single-Model Fallback</span>
              <span className="text-[10px] text-cad-muted">All semantic roles (Planner, Router, HoleFiller, Oracle) inherit this model unless overridden.</span>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted">Provider Preset</label>
              <select
                value={config.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text"
              >
                {Object.keys(PROVIDER_PRESETS).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted">Model Name</label>
              <input
                type="text"
                value={config.model_name}
                onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted">Base URL</label>
              <input
                type="text"
                value={config.base_url || ''}
                onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
                className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono text-[11px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted">API Key Env Var</label>
              <input
                type="text"
                value={config.api_key_env || ''}
                onChange={(e) => setConfig({ ...config, api_key_env: e.target.value })}
                placeholder="e.g. DEEPSEEK_API_KEY"
                className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono text-[11px]"
              />
            </div>
          </div>

          <div className="border border-cad-border rounded p-2.5 bg-cad-bg/40">
            <button
              type="button"
              onClick={() => setShowOverrides(!showOverrides)}
              className="flex items-center justify-between w-full text-left font-bold text-cad-text text-[11px]"
            >
              <span>Advanced: Per-Role Overrides (Planner, Router, HoleFiller, Oracle)</span>
              {showOverrides ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {showOverrides && (
              <div className="mt-3 flex flex-col gap-2 border-t border-cad-border pt-2 text-[11px] text-cad-muted">
                {['planner', 'system1_router', 'hole_filler', 'oracle'].map((role) => (
                  <div key={role} className="flex items-center justify-between p-1.5 bg-cad-bg rounded border border-cad-border/60">
                    <span className="font-mono text-cad-text font-medium">{role}</span>
                    <span className="text-[10px] text-cad-cyan">Inherits universal fallback</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {testReceipt && (
            <div className={`p-2.5 rounded border text-[11px] flex items-start gap-2 ${
              testReceipt.success ? 'bg-cad-emerald/10 border-cad-emerald/40 text-cad-emerald' : 'bg-cad-crimson/10 border-cad-crimson/40 text-cad-crimson'
            }`}>
              {testReceipt.success ? <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div className="flex flex-col">
                <span className="font-semibold">{testReceipt.success ? `Connected (${testReceipt.latency_ms}ms)` : 'Connection Error'}</span>
                <span className="text-[10px] opacity-90">{testReceipt.message}</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-cad-border bg-cad-bg/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestInference}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cad-border bg-cad-bg text-cad-cyan hover:border-cad-cyan/50 text-[11px] font-semibold"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{testing ? 'Testing Ping...' : 'Test Inference'}</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded border border-cad-border text-cad-muted hover:text-cad-text">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-cad-cyan text-black font-semibold hover:bg-cad-cyan/90 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save to sawhorse.toml'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

