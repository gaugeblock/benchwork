import React, { useState } from 'react';
import type { UniversalModelConfig, TestInferenceReceipt } from '../../types';
import { api } from '../../api/client';
import { Cpu, ShieldCheck, Activity, Save, ChevronDown, ChevronRight, X, AlertCircle } from 'lucide-react';
import { ConnectionStep } from './ConnectionStep';
import { ModelStep } from './ModelStep';
import { PROVIDER_PRESETS } from './presets';

interface UniversalConfigModalProps {
  config: UniversalModelConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (cfg: UniversalModelConfig) => void;
}

export const UniversalConfigModal: React.FC<UniversalConfigModalProps> = ({
  config: initialConfig,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<UniversalModelConfig>(initialConfig);
  const [directApiKey, setDirectApiKey] = useState('');
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<{ text: string; error: boolean } | null>(null);
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
        model_name: preset.model || prev.model_name,
      }));
    } else {
      setConfig((prev) => ({ ...prev, provider }));
    }
    setDiscoveredModels([]);
    setFetchMsg(null);
  };

  const handleDiscoverModels = async () => {
    if (!config.base_url) return;
    setFetchingModels(true);
    setFetchMsg(null);
    try {
      const res = await api.discoverModels({
        base_url: config.base_url,
        api_key: directApiKey.trim() || undefined,
        api_key_env: config.api_key_env || undefined,
      });
      if (res.success && res.models.length > 0) {
        setDiscoveredModels(res.models);
        setFetchMsg({ text: `Found ${res.models.length} model(s)`, error: false });
        if (!config.model_name || !res.models.includes(config.model_name)) {
          setConfig((prev) => ({ ...prev, model_name: res.models[0] }));
        }
      } else {
        setFetchMsg({ text: res.message || 'No models returned', error: true });
      }
    } catch (err: any) {
      setFetchMsg({ text: err.message || 'Discovery request failed', error: true });
    } finally {
      setFetchingModels(false);
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
          <button onClick={onClose} className="text-cad-muted hover:text-cad-text"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex flex-col gap-3.5">
          <label className="flex items-center gap-2 cursor-pointer bg-cad-bg p-2.5 rounded border border-cad-border">
            <input
              type="checkbox"
              checked={config.use_universal_fallback}
              onChange={(e) => setConfig({ ...config, use_universal_fallback: e.target.checked })}
              className="rounded bg-cad-bg border-cad-border text-cad-cyan focus:ring-0"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-cad-text">Universal Single-Model Fallback</span>
              <span className="text-[10px] text-cad-muted">All semantic roles inherit this provider/model configuration.</span>
            </div>
          </label>

          <ConnectionStep
            config={config}
            directApiKey={directApiKey}
            fetchingModels={fetchingModels}
            fetchMsg={fetchMsg}
            onProviderChange={handleProviderChange}
            onBaseUrlChange={(url) => setConfig({ ...config, base_url: url })}
            onApiKeyEnvChange={(env) => setConfig({ ...config, api_key_env: env })}
            onDirectKeyChange={setDirectApiKey}
            onDiscover={handleDiscoverModels}
          />

          <ModelStep
            modelName={config.model_name}
            discoveredModels={discoveredModels}
            onModelNameChange={(m) => setConfig({ ...config, model_name: m })}
          />

          <div className="border border-cad-border rounded p-2 bg-cad-bg/40">
            <button
              type="button"
              onClick={() => setShowOverrides(!showOverrides)}
              className="flex items-center justify-between w-full text-left font-bold text-cad-text text-[11px]"
            >
              <span>Advanced: Semantic Role Overrides</span>
              {showOverrides ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {showOverrides && (
              <div className="mt-2.5 flex flex-col gap-1.5 border-t border-cad-border pt-2 text-[10px] text-cad-muted">
                {['planner', 'system1_router', 'hole_filler', 'oracle'].map((role) => (
                  <div key={role} className="flex items-center justify-between p-1 bg-cad-bg rounded border border-cad-border/60">
                    <span className="font-mono text-cad-text">{role}</span>
                    <span className="text-cad-cyan">Inherits universal fallback</span>
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
            disabled={testing || !config.model_name}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-cad-border bg-cad-bg text-cad-cyan hover:border-cad-cyan/50 text-[11px] font-semibold disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{testing ? 'Testing Ping...' : 'Test Inference'}</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded border border-cad-border text-cad-muted hover:text-cad-text">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !config.model_name}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-cad-cyan text-black font-semibold hover:bg-cad-cyan/90 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
