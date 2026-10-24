import React, { useEffect, useState } from 'react';
import type { TaskContextBriefing } from '../../types';
import { api } from '../../api/client';
import { InspectorHeader } from './inspector/InspectorHeader';
import { InspectorScope } from './inspector/InspectorScope';
import { InspectorDecisions } from './inspector/InspectorDecisions';
import { InspectorHandoffAndGate } from './inspector/InspectorHandoffAndGate';
import { CheckSquare, GitFork } from 'lucide-react';

interface TaskBriefingDrawerProps {
  taskId: string;
  onClose: () => void;
  onSynthesize?: (taskId: string) => void;
}

export const TaskBriefingDrawer: React.FC<TaskBriefingDrawerProps> = ({
  taskId,
  onClose,
  onSynthesize,
}) => {
  const [briefing, setBriefing] = useState<TaskContextBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getTaskBriefing(taskId)
      .then((data) => {
        if (mounted) setBriefing(data);
      })
      .catch((err) => console.error('Failed loading briefing:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [taskId]);

  const handleSynthesize = async (id: string) => {
    setSynthesizing(true);
    try {
      if (onSynthesize) {
        onSynthesize(id);
      } else {
        await api.triggerSynthesis({ task_id: id, force_in_process: true });
      }
    } catch (err) {
      console.error('Synthesis trigger failed:', err);
    } finally {
      setSynthesizing(false);
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[460px] bg-cad-surface border-l border-cad-border shadow-2xl flex flex-col z-20 overflow-hidden">
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-cad-muted animate-pulse">
          Loading Task Context Briefing...
        </div>
      ) : briefing ? (
        <>
          <InspectorHeader
            task={briefing.task}
            onClose={onClose}
            onSynthesize={handleSynthesize}
            synthesizing={synthesizing}
          />

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
            {/* Scope Coordinates & Collision Warnings */}
            <InspectorScope
              scope={briefing.task.scope}
              collisionWarnings={briefing.file_collision_warnings}
            />

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
                Description
              </span>
              <p className="text-cad-text leading-relaxed bg-cad-bg/60 p-3 rounded border border-cad-border whitespace-pre-wrap">
                {briefing.task.description || 'No description provided.'}
              </p>
            </div>

            {/* Acceptance Criteria Checklist */}
            {briefing.task.acceptance_criteria && briefing.task.acceptance_criteria.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-cad-muted tracking-wider">
                  Acceptance Criteria ({briefing.task.acceptance_criteria.length})
                </span>
                <div className="flex flex-col gap-1.5 p-3 rounded bg-cad-bg border border-cad-border">
                  {briefing.task.acceptance_criteria.map((crit, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-cad-text">
                      <CheckSquare className="w-3.5 h-3.5 text-cad-cyan shrink-0 mt-0.5" />
                      <span className="leading-tight">{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dependency Edges & Related Tasks */}
            {briefing.related_tasks_summary && briefing.related_tasks_summary.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-cad-muted tracking-wider flex items-center gap-1">
                  <GitFork className="w-3 h-3 text-cad-cyan" /> Related Tasks & Edges
                </span>
                <div className="flex flex-col gap-1.5 p-2 rounded bg-cad-bg border border-cad-border">
                  {briefing.related_tasks_summary.map(([key, title, status], i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-1.5 rounded bg-cad-surface border border-cad-border text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono font-bold text-cad-cyan">{key}</span>
                        <span className="truncate text-cad-text">{title}</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 rounded border uppercase font-mono text-cad-muted">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decisions */}
            <InspectorDecisions
              decisions={briefing.task.decisions}
              inheritedDecisions={briefing.inherited_decisions}
            />

            {/* Verification Gate & Handoff */}
            <InspectorHandoffAndGate
              verificationCommand={briefing.verification_command}
              verificationReceipt={briefing.task.verification_receipt}
              activeClaim={briefing.task.active_claim}
              latestHandoff={briefing.task.latest_handoff}
              deferredIssues={briefing.known_deferred_issues_in_scope}
            />
          </div>
        </>
      ) : null}
    </div>
  );
};
