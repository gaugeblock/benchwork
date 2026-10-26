import React from 'react';
import { Bot, ChevronLeft, ChevronRight, Eye, LayoutGrid, Sparkles } from 'lucide-react';
import type { BenjiDock } from './useBenjiResize';

interface BenjiHeaderProps {
  role: string;
  onRoleChange: (newRole: string) => void;
  dock: BenjiDock;
  onToggleDock: () => void;
  showXRay: boolean;
  onToggleXRay: () => void;
  onClose: () => void;
}

const AVAILABLE_ROLES = [
  { id: 'planner', name: 'Planner', desc: 'DAG blueprint & specs' },
  { id: 'oracle', name: 'Oracle', desc: 'Unconstrained reasoning' },
  { id: 'universal', name: 'Universal', desc: 'General assistance' },
];

export const BenjiHeader: React.FC<BenjiHeaderProps> = ({
  role,
  onRoleChange,
  dock,
  onToggleDock,
  showXRay,
  onToggleXRay,
  onClose,
}) => {
  return (
    <div className="h-10 border-b border-cad-border bg-cad-surface flex items-center justify-between px-3 shrink-0 font-mono text-xs select-none">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-cad-cyan font-bold tracking-wider uppercase">
          <Bot className="w-4 h-4 text-cad-cyan" />
          <span>Benji</span>
        </div>
        <span className="w-1.5 h-1.5 rounded-full bg-cad-emerald animate-pulse" title="Connected to Sawhorse" />
      </div>

      <div className="flex items-center gap-1.5">
        {/* Dynamic Model Role Selector */}
        <div className="relative flex items-center">
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            className="bg-cad-bg border border-cad-border text-cad-text text-[11px] font-mono rounded px-2 py-0.5 focus:border-cad-cyan focus:outline-none cursor-pointer appearance-none pr-5 hover:border-cad-cyan/60 transition-colors"
            title="Sawhorse Routing Role"
          >
            {AVAILABLE_ROLES.map((r) => (
              <option key={r.id} value={r.id} className="bg-cad-surface text-cad-text">
                {r.name}
              </option>
            ))}
          </select>
          <Sparkles className="w-2.5 h-2.5 text-cad-cyan absolute right-1.5 pointer-events-none" />
        </div>

        {/* X-Ray Radar Toggle */}
        <button
          onClick={onToggleXRay}
          className={`p-1 rounded transition-colors ${
            showXRay
              ? 'bg-cad-cyan/20 text-cad-cyan border border-cad-cyan/40'
              : 'text-cad-muted hover:text-cad-text hover:bg-cad-subsurface border border-transparent'
          }`}
          title="Toggle Context Radar (X-Ray)"
          type="button"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* Dock Left / Right Toggle */}
        <button
          onClick={onToggleDock}
          className="p-1 text-cad-muted hover:text-cad-text hover:bg-cad-subsurface rounded transition-colors"
          title={`Dock ${dock === 'left' ? 'Right' : 'Left'}`}
          type="button"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>

        {/* Collapse / Close Button */}
        <button
          onClick={onClose}
          className="p-1 text-cad-muted hover:text-cad-text hover:bg-cad-subsurface rounded transition-colors"
          title="Collapse Benji Sidebar"
          type="button"
        >
          {dock === 'left' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

