import React, { useEffect, useState } from 'react';
import type { SharedTypeContract } from '../../types';
import { api } from '../../api/client';
import { Code2, Copy, Check } from 'lucide-react';

interface ContractPreviewProps {
  contract: SharedTypeContract;
}

export const ContractPreview: React.FC<ContractPreviewProps> = ({ contract }) => {
  const [activeTab, setActiveTab] = useState<'rust' | 'ts' | 'zod'>('rust');
  const [code, setCode] = useState<{ rust: string; ts: string; zod: string }>({
    rust: '// Emitting Rust Serde struct...',
    ts: '// Emitting TypeScript interface...',
    zod: '// Emitting Zod schema...',
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.previewContract(contract)
      .then((res) => {
        if (mounted) {
          setCode({
            rust: res.rust_code,
            ts: res.typescript_code,
            zod: res.zod_code,
          });
        }
      })
      .catch((err) => {
        if (mounted) {
          setCode({
            rust: `// Error emitting Rust: ${err}`,
            ts: `// Error emitting TS: ${err}`,
            zod: `// Error emitting Zod: ${err}`,
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, [contract]);

  const currentCode =
    activeTab === 'rust' ? code.rust : activeTab === 'ts' ? code.ts : code.zod;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border border-cad-border bg-cad-surface rounded flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-cad-border bg-cad-subsurface/60">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-cad-cyan" />
          <span className="text-xs font-semibold text-cad-text uppercase">
            Contract: {contract.name}
          </span>
          <span className="text-[10px] text-cad-muted px-1.5 py-0.5 rounded bg-cad-bg border border-cad-border">
            {contract.fields.length} fields
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex bg-cad-bg border border-cad-border rounded p-0.5">
            <button
              onClick={() => setActiveTab('rust')}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                activeTab === 'rust'
                  ? 'bg-cad-cyan/20 text-cad-cyan font-medium'
                  : 'text-cad-muted hover:text-cad-text'
              }`}
            >
              Rust
            </button>
            <button
              onClick={() => setActiveTab('ts')}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                activeTab === 'ts'
                  ? 'bg-cad-cyan/20 text-cad-cyan font-medium'
                  : 'text-cad-muted hover:text-cad-text'
              }`}
            >
              TypeScript
            </button>
            <button
              onClick={() => setActiveTab('zod')}
              className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                activeTab === 'zod'
                  ? 'bg-cad-cyan/20 text-cad-cyan font-medium'
                  : 'text-cad-muted hover:text-cad-text'
              }`}
            >
              Zod
            </button>
          </div>

          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            className="p-1 hover:bg-cad-subsurface text-cad-muted hover:text-cad-text rounded border border-transparent hover:border-cad-border transition-colors ml-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-cad-emerald" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="p-3 bg-cad-bg/95 font-mono text-[11px] leading-relaxed text-cad-text overflow-x-auto max-h-56">
        <pre className="whitespace-pre">{currentCode}</pre>
      </div>
    </div>
  );
};
