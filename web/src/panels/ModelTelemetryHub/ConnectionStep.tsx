import React from 'react';
import type { UniversalModelConfig } from '../../types';
import { Key, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { PROVIDER_PRESETS } from './presets';

interface ConnectionStepProps {
  config: UniversalModelConfig;
  directApiKey: string;
  fetchingModels: boolean;
  fetchMsg: { text: string; error: boolean } | null;
  onProviderChange: (provider: string) => void;
  onBaseUrlChange: (url: string) => void;
  onApiKeyEnvChange: (env: string) => void;
  onDirectKeyChange: (key: string) => void;
  onDiscover: () => void;
}

export const ConnectionStep: React.FC<ConnectionStepProps> = ({
  config,
  directApiKey,
  fetchingModels,
  fetchMsg,
  onProviderChange,
  onBaseUrlChange,
  onApiKeyEnvChange,
  onDirectKeyChange,
  onDiscover,
}) => {
  return (
    <div className="border border-cad-border rounded p-2.5 bg-cad-bg/30 flex flex-col gap-2.5">
      <span className="text-[11px] font-bold text-cad-cyan uppercase tracking-wider">
        Step 1: Provider & Endpoint Connection
      </span>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-cad-muted">Provider Preset</label>
          <select
            value={config.provider}
            onChange={(e) => onProviderChange(e.target.value)}
            className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text"
          >
            {Object.keys(PROVIDER_PRESETS).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-cad-muted">Base URL</label>
          <input
            type="text"
            value={config.base_url || ''}
            onChange={(e) => onBaseUrlChange(e.target.value)}
            placeholder="https://api.cline.bot/v1"
            className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono text-[11px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-cad-muted">API Key Env Var</label>
          <input
            type="text"
            value={config.api_key_env || ''}
            onChange={(e) => onApiKeyEnvChange(e.target.value)}
            placeholder="e.g. CLINE_API_KEY"
            className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono text-[11px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-cad-muted flex items-center gap-1">
            <Key className="w-3 h-3 text-cad-amber" />
            <span>Direct Key (Probe / Discover)</span>
          </label>
          <div className="flex gap-1.5">
            <input
              type="password"
              value={directApiKey}
              onChange={(e) => onDirectKeyChange(e.target.value)}
              placeholder="sk-..."
              className="flex-1 bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono text-[11px]"
            />
            <button
              type="button"
              onClick={onDiscover}
              disabled={fetchingModels || !config.base_url}
              className="flex items-center gap-1 px-2 py-1.5 rounded bg-cad-cyan/20 border border-cad-cyan/50 text-cad-cyan hover:bg-cad-cyan/30 text-[10px] font-semibold shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${fetchingModels ? 'animate-spin' : ''}`} />
              <span>{fetchingModels ? '...' : 'Fetch Models'}</span>
            </button>
          </div>
        </div>
      </div>

      {fetchMsg && (
        <div className={`text-[10px] px-2 py-1 rounded flex items-center gap-1.5 ${fetchMsg.error ? 'text-cad-crimson bg-cad-crimson/10' : 'text-cad-emerald bg-cad-emerald/10'}`}>
          {fetchMsg.error ? <AlertCircle className="w-3 h-3 shrink-0" /> : <ShieldCheck className="w-3 h-3 shrink-0" />}
          <span>{fetchMsg.text}</span>
        </div>
      )}
    </div>
  );
};
