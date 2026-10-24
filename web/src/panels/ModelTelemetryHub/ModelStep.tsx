import React, { useState } from 'react';

interface ModelStepProps {
  modelName: string;
  discoveredModels: string[];
  onModelNameChange: (model: string) => void;
}

export const ModelStep: React.FC<ModelStepProps> = ({
  modelName,
  discoveredModels,
  onModelNameChange,
}) => {
  const [manual, setManual] = useState(false);

  return (
    <div className="border border-cad-border rounded p-2.5 bg-cad-bg/30 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-cad-cyan uppercase tracking-wider">
          Step 2: Model Selection
        </span>
        {discoveredModels.length > 0 && (
          <button
            type="button"
            onClick={() => setManual(!manual)}
            className="text-[10px] text-cad-muted hover:text-cad-cyan underline"
          >
            {manual ? 'Select from discovered list' : 'Type model manually'}
          </button>
        )}
      </div>

      {discoveredModels.length > 0 && !manual ? (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-cad-muted">
            Discovered Models ({discoveredModels.length})
          </label>
          <select
            value={modelName}
            onChange={(e) => onModelNameChange(e.target.value)}
            className="bg-cad-bg border border-cad-cyan/60 rounded px-2.5 py-1.5 text-cad-text font-mono text-[11px]"
          >
            {discoveredModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-bold text-cad-muted">Model Name</label>
          <input
            type="text"
            value={modelName}
            onChange={(e) => onModelNameChange(e.target.value)}
            placeholder="e.g. claude-3-5-sonnet, deepseek-coder"
            className="bg-cad-bg border border-cad-border rounded px-2.5 py-1.5 text-cad-text font-mono"
          />
        </div>
      )}
    </div>
  );
};
