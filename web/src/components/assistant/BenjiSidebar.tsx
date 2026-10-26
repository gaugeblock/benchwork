import React, { useState } from 'react';
import { Bot, ChevronRight, ChevronLeft } from 'lucide-react';
import { useBenjiResize } from './useBenjiResize';
import { useBenjiChat, UiViewportContext } from '../../chat/useBenjiChat';
import { BenjiHeader } from './BenjiHeader';
import { BenjiMessages } from './BenjiMessages';
import { BenjiInput } from './BenjiInput';
import { XRayInspector } from '../../chat/XRayInspector';

interface BenjiSidebarProps {
  activePanel: string;
  focusedTaskKey?: string;
  focusedDocArchetype?: string;
}

export const BenjiSidebar: React.FC<BenjiSidebarProps> = ({
  activePanel,
  focusedTaskKey,
  focusedDocArchetype,
}) => {
  const {
    width,
    dock,
    collapsed,
    setCollapsed,
    toggleDock,
    toggleCollapsed,
    startResizing,
  } = useBenjiResize();

  const [role, setRole] = useState('planner');
  const [showXRay, setShowXRay] = useState(false);

  const viewport: UiViewportContext = {
    active_panel: activePanel,
    focused_task_key: focusedTaskKey,
    focused_doc_archetype: focusedDocArchetype,
  };

  const { messages, isRunning, threadId, appendUserMessage, applyProposal } =
    useBenjiChat(viewport, role);

  if (collapsed) {
    return (
      <aside
        className={`w-10 border-cad-border bg-cad-surface flex flex-col items-center py-3 shrink-0 select-none z-20 ${
          dock === 'left' ? 'order-first border-r' : 'order-last border-l'
        }`}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 text-cad-cyan hover:bg-cad-subsurface rounded transition-colors"
          title="Expand Benji Assistant Sidebar"
          type="button"
        >
          {dock === 'left' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <div className="mt-8 [writing-mode:vertical-rl] text-xs font-mono text-cad-muted tracking-widest uppercase flex items-center gap-2">
          <Bot className="w-3.5 h-3.5 text-cad-cyan rotate-90" />
          <span>Benji</span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      style={{ width: `${width}px` }}
      className={`relative flex flex-col h-full bg-cad-surface shrink-0 font-mono text-xs z-20 overflow-hidden ${
        dock === 'left' ? 'order-first border-r border-cad-border' : 'order-last border-l border-cad-border'
      }`}
    >
      {/* Drag-to-Resize Handle */}
      <div
        onMouseDown={startResizing}
        className={`absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-cad-cyan/50 transition-colors z-30 ${
          dock === 'left' ? 'right-0' : 'left-0'
        }`}
        title="Drag to resize Benji sidebar"
      />

      <BenjiHeader
        role={role}
        onRoleChange={setRole}
        dock={dock}
        onToggleDock={toggleDock}
        showXRay={showXRay}
        onToggleXRay={() => setShowXRay((prev) => !prev)}
        onClose={toggleCollapsed}
      />

      {showXRay && (
        <XRayInspector
          viewport={viewport}
          threadId={threadId}
          onClose={() => setShowXRay(false)}
        />
      )}

      <BenjiMessages
        messages={messages}
        isRunning={isRunning}
        onApplyProposal={applyProposal}
      />

      <BenjiInput
        onSend={appendUserMessage}
        isRunning={isRunning}
        focusedTaskKey={focusedTaskKey}
      />
    </aside>
  );
};
