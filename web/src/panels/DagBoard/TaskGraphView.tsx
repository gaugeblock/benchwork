import React, { useState, useRef, useMemo } from 'react';
import type { TaskNode } from '../../types';
import { computeDagLayout } from './dagLayout';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface TaskGraphViewProps {
  tasks: TaskNode[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

const STATUS_COLORS: Record<string, { stroke: string; fill: string; text: string }> = {
  verified: { stroke: '#10b981', fill: '#10b98120', text: '#10b981' },
  ready: { stroke: '#06b6d4', fill: '#06b6d420', text: '#06b6d4' },
  in_progress: { stroke: '#06b6d4', fill: '#06b6d435', text: '#38bdf8' },
  synthesizing: { stroke: '#06b6d4', fill: '#06b6d445', text: '#06b6d4' },
  verifying: { stroke: '#38bdf8', fill: '#38bdf830', text: '#38bdf8' },
  blocked: { stroke: '#f59e0b', fill: '#f59e0b20', text: '#f59e0b' },
  failed: { stroke: '#ef4444', fill: '#ef444425', text: '#ef4444' },
  triage: { stroke: '#6b7280', fill: '#6b728020', text: '#9ca3af' },
  deferred: { stroke: '#c084fc', fill: '#c084fc20', text: '#c084fc' },
  archived: { stroke: '#52525b', fill: '#27272a20', text: '#71717a' },
};

export const TaskGraphView: React.FC<TaskGraphViewProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
}) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const layout = useMemo(() => computeDagLayout(tasks), [tasks]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 2.2));
  };

  return (
    <div
      className="relative flex-1 w-full h-full overflow-hidden bg-cad-bg cad-grid cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Zoom / Pan Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-cad-surface border border-cad-border p-1 rounded shadow-lg">
        <button
          onClick={() => setScale((s) => Math.min(s * 1.15, 2.2))}
          className="p-1 hover:bg-cad-subsurface rounded text-cad-muted hover:text-cad-text"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s * 0.85, 0.4))}
          className="p-1 hover:bg-cad-subsurface rounded text-cad-muted hover:text-cad-text"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}
          className="p-1 hover:bg-cad-subsurface rounded text-cad-muted hover:text-cad-text"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[10px] px-1.5 text-cad-muted">{Math.round(scale * 100)}%</span>
      </div>

      <svg className="w-full h-full pointer-events-none">
        <g
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
          }}
          className="pointer-events-auto"
        >
          {/* Edge Connector Wires */}
          {layout.edges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              fill="none"
              stroke={edge.kind === 'blocked_by' ? '#374151' : '#1f2937'}
              strokeWidth={edge.kind === 'blocked_by' ? 2 : 1.5}
              strokeDasharray={edge.kind === 'blocked_by' ? undefined : '4 3'}
              className="transition-all"
            />
          ))}

          {/* Task Nodes */}
          {layout.nodes.map((n) => {
            const isSelected = selectedTaskId === n.task.id;
            const colors = STATUS_COLORS[n.task.status] || STATUS_COLORS.triage;
            const hasPendingDecisions = n.task.decisions.some((d) => !d.chosen_option);

            return (
              <g
                key={n.task.id}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTask(n.task.id);
                }}
                className="cursor-pointer group"
              >
                <rect
                  width={n.width}
                  height={n.height}
                  rx={4}
                  fill="#111827"
                  stroke={isSelected ? '#06b6d4' : colors.stroke}
                  strokeWidth={isSelected ? 2 : 1}
                  className="transition-all group-hover:brightness-125"
                />

                {/* Left Accent Status Strip */}
                <rect width={4} height={n.height} rx={2} fill={colors.stroke} />

                {/* Ticket Key & Kind */}
                <text x={12} y={20} fill="#f3f4f6" fontSize={11} fontWeight="bold">
                  {n.task.ticket_key}
                </text>
                <text x={12} y={35} fill="#9ca3af" fontSize={10}>
                  {n.task.kind} {n.task.scope.crate_name ? `• ${n.task.scope.crate_name}` : ''}
                </text>

                {/* Status Pill */}
                <rect x={n.width - 70} y={10} width={62} height={16} rx={2} fill={colors.fill} />
                <text x={n.width - 39} y={22} fill={colors.text} fontSize={9} textAnchor="middle">
                  {n.task.status}
                </text>

                {/* Title Line */}
                <text x={12} y={54} fill="#e5e7eb" fontSize={10} className="truncate">
                  {n.task.title.length > 28 ? `${n.task.title.slice(0, 26)}...` : n.task.title}
                </text>

                {/* Pending Decision Dot */}
                {hasPendingDecisions && (
                  <circle cx={n.width - 10} cy={n.height - 10} r={4} fill="#f59e0b" />
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
