import React, { useState, useMemo, useEffect } from 'react';
import { CLINEPASS_MODELS } from './presets';
import { Filter } from 'lucide-react';

interface ModelStepProps {
  modelName: string;
  provider: string;
  discoveredModels: string[];
  onModelNameChange: (model: string) => void;
}

export const ModelStep: React.FC<ModelStepProps> = ({
  modelName,
  provider,
  discoveredModels,
  onModelNameChange,
}) => {
  const [manual, setManual] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<string>('all');

  const effectiveModels = useMemo(() => {
    if (discoveredModels.length > 0) return discoveredModels;
    if (provider === 'ClinePass') return CLINEPASS_MODELS;
    return [];
  }, [discoveredModels, provider]);

  const families = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of effectiveModels) {
      const idx = m.indexOf('/');
      if (idx > 0) {
        const fam = m.slice(0, idx);
        counts.set(fam, (counts.get(fam) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [effectiveModels]);

  useEffect(() => {
    if (provider === 'ClinePass' || modelName.startsWith('cline-pass/')) {
      setSelectedFamily('cline-pass');
    } else if (families.length > 0 && selectedFamily !== 'all') {
      if (!families.some(([fam]) => fam === selectedFamily)) {
        setSelectedFamily('all');
      }
    }
  }, [provider, modelName, families]);

  const filteredModels = useMemo(() => {
    if (selectedFamily === 'all') return effectiveModels;
    return effectiveModels.filter((m) => m.startsWith(selectedFamily + '/'));
  }, [effectiveModels, selectedFamily]);

  const handleFamilyChange = (fam: string) => {
    setSelectedFamily(fam);
    const subset = fam === 'all' ? effectiveModels : effectiveModels.filter((m) => m.startsWith(fam + '/'));
    if (subset.length > 0 && !subset.includes(modelName)) {
      onModelNameChange(subset[0]);
    }
  };

  return (
    <div className="border border-cad-border rounded p-2.5 bg-cad-bg/30 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-cad-cyan uppercase tracking-wider">
          Step 2: Model Selection
        </span>
        {effectiveModels.length > 0 && (
          <button
            type="button"
            onClick={() => setManual(!manual)}
            className="text-[10px] text-cad-muted hover:text-cad-cyan underline"
          >
            {manual ? 'Select from discovered list' : 'Type model manually'}
          </button>
        )}
      </div>

      {effectiveModels.length > 0 && !manual ? (
        <div className="flex flex-col gap-2">
          {families.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-cad-muted flex items-center gap-1">
                <Filter className="w-3 h-3 text-cad-cyan" />
                <span>Filter Provider / Family ({families.length})</span>
              </label>
              <select
                value={selectedFamily}
                onChange={(e) => handleFamilyChange(e.target.value)}
                className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text text-[11px]"
              >
                <option value="all">All Available Families ({effectiveModels.length})</option>
                {families.map(([fam, count]) => (
                  <option key={fam} value={fam}>
                    {fam} ({count} model{count > 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-cad-muted">
              Select Model ({filteredModels.length})
            </label>
            <select
              value={modelName}
              onChange={(e) => onModelNameChange(e.target.value)}
              className="bg-cad-bg border border-cad-cyan/60 rounded px-2.5 py-1.5 text-cad-text font-mono text-[11px]"
            >
              {filteredModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-cad-muted">Model Name</label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => onModelNameChange(e.target.value)}
            placeholder="e.g. cline-pass/deepseek-v4-pro, claude-3-5-sonnet"
            className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono"
          />
        </div>
      )}
    </div>
  );
};
