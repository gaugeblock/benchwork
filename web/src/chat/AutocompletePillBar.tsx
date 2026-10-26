import React from 'react';
import { HelpCircle, FileCode, CheckSquare, Sparkles } from 'lucide-react';

interface AutocompletePillBarProps {
  onSelect: (snippet: string) => void;
  focusedTaskKey?: string;
}

export const AutocompletePillBar: React.FC<AutocompletePillBarProps> = ({
  onSelect,
  focusedTaskKey,
}) => {
  const pills = [
    { label: '/grill-me', snippet: '/grill-me ', icon: HelpCircle, title: 'Interactive decision interview' },
    { label: '/disentangle', snippet: '/disentangle ', icon: FileCode, title: '9-doc classification' },
    {
      label: focusedTaskKey ? `/plan ${focusedTaskKey}` : '/plan',
      snippet: focusedTaskKey ? `/plan ${focusedTaskKey} ` : '/plan ',
      icon: CheckSquare,
      title: 'Generate task blueprint',
    },
    { label: '@doc:SPEC', snippet: '@doc:SPEC ', icon: Sparkles, title: 'Inject SPEC doc preview' },
    { label: '@doc:ARCH', snippet: '@doc:ARCHITECTURE ', icon: Sparkles, title: 'Inject ARCHITECTURE doc preview' },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2 border-b border-cad-border/50 bg-cad-subsurface/30 shrink-0 scrollbar-none">
      {pills.map((pill) => {
        const Icon = pill.icon;
        return (
          <button
            key={pill.label}
            onClick={() => onSelect(pill.snippet)}
            title={pill.title}
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-cad-subsurface border border-cad-border text-cad-muted hover:text-cad-cyan hover:border-cad-cyan/60 transition-colors whitespace-nowrap shrink-0"
          >
            <Icon className="w-3 h-3 text-cad-cyan" />
            <span>{pill.label}</span>
          </button>
        );
      })}
    </div>
  );
};

