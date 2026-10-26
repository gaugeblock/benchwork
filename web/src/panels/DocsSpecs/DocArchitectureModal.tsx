import React, { useState, useEffect } from 'react';
import { docsApi } from '../../api/docsClient';
import type { DocsConfig } from '../../types/docs';
import { Settings, X, Save, RefreshCw } from 'lucide-react';

interface DocArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const DocArchitectureModal: React.FC<DocArchitectureModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [config, setConfig] = useState<DocsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      docsApi
        .getDocsConfig()
        .then(setConfig)
        .catch((e) => console.error('Failed to load docs config:', e))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await docsApi.saveDocsConfig(config);
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed saving docs config:', err);
    } finally {
      setSaving(false);
    }
  };

  const togglePolicy = (key: keyof DocsConfig['policies']) => {
    if (!config) return;
    setConfig({
      ...config,
      policies: {
        ...config.policies,
        [key]: !config.policies[key],
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-cad-surface border border-cad-border rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-cad-border bg-cad-bg">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-cad-cyan" />
            <h2 className="text-sm font-bold tracking-wide text-cad-text uppercase">
              .gaugeblock/docs.toml Architecture Settings
            </h2>
          </div>
          <button onClick={onClose} className="text-cad-muted hover:text-cad-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs">
          {loading || !config ? (
            <div className="flex items-center justify-center py-10 text-cad-muted animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading configuration...
            </div>
          ) : (
            <>
              <div>
                <h3 className="font-bold text-cad-cyan uppercase tracking-wider mb-2">
                  Verification & Compliance Policies
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-cad-bg p-3 rounded border border-cad-border">
                  {Object.entries(config.policies).map(([key, val]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer text-cad-muted hover:text-cad-text select-none py-1"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={() => togglePolicy(key as keyof DocsConfig['policies'])}
                        className="rounded border-cad-border text-cad-cyan focus:ring-0 focus:ring-offset-0 bg-cad-surface"
                      />
                      <span className="font-mono text-[11px]">{key}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-cad-cyan uppercase tracking-wider mb-2">
                  Canonical 9 Documents Mappings
                </h3>
                <div className="space-y-1.5 bg-cad-bg p-3 rounded border border-cad-border">
                  {Object.entries(config.docs).map(([name, entry]) => (
                    <div key={name} className="flex items-center justify-between gap-3 py-1">
                      <span className="font-mono font-bold text-cad-text uppercase w-28 shrink-0">
                        {name}
                      </span>
                      <input
                        type="text"
                        value={entry.path}
                        onChange={(e) => {
                          setConfig({
                            ...config,
                            docs: {
                              ...config.docs,
                              [name]: { ...entry, path: e.target.value },
                            },
                          });
                        }}
                        className="flex-1 bg-cad-surface border border-cad-border rounded px-2 py-1 text-cad-text font-mono text-[11px] focus:outline-none focus:border-cad-cyan"
                      />
                      <label className="flex items-center gap-1.5 text-cad-muted cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={entry.required}
                          onChange={(e) => {
                            setConfig({
                              ...config,
                              docs: {
                                ...config.docs,
                                [name]: { ...entry, required: e.target.checked },
                              },
                            });
                          }}
                          className="rounded border-cad-border text-cad-cyan focus:ring-0 bg-cad-surface"
                        />
                        <span className="text-[10px]">Required</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-cad-border bg-cad-bg">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border border-cad-border text-xs text-cad-muted hover:text-cad-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !config}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cad-cyan/20 border border-cad-cyan/40 text-xs font-semibold text-cad-cyan hover:bg-cad-cyan/30 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
