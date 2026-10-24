import React, { useEffect, useState } from 'react';
import type { TaskContextBriefing, TaskNode } from '../../types';
import { api } from '../../api/client';
import { InspectorHeader } from './inspector/InspectorHeader';
import { InspectorScope } from './inspector/InspectorScope';
import { InspectorDescription } from './inspector/InspectorDescription';
import { InspectorPlan } from './inspector/InspectorPlan';
import { InspectorEdges } from './inspector/InspectorEdges';
import { InspectorDecisions } from './inspector/InspectorDecisions';
import { InspectorHandoffAndGate } from './inspector/InspectorHandoffAndGate';
import { copyTextToClipboard, formatTaskBriefingMarkdown } from './inspector/clipboardUtils';

interface TaskBriefingDrawerProps {
  taskId: string;
  onClose: () => void;
  onSynthesize?: (taskId: string) => void;
  onDiscussInChat?: (task: TaskNode) => void;
}

export const TaskBriefingDrawer: React.FC<TaskBriefingDrawerProps> = ({
  taskId,
  onClose,
  onSynthesize,
  onDiscussInChat,
}) => {
  const [briefing, setBriefing] = useState<TaskContextBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [ticketCopied, setTicketCopied] = useState(false);

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

  const handleClaim = async (agentId: string, branch: string) => {
    const updated = await api.claimTask(taskId, { agent_id: agentId, branch });
    setBriefing(updated);
  };

  const handleHandoff = async (data: {
    recorded_by_agent: string;
    completed_items: string[];
    remaining_items: string[];
    last_error_or_blocker?: string;
    status: string;
  }) => {
    await api.recordHandoff(taskId, data);
    const updated = await api.getTaskBriefing(taskId);
    setBriefing(updated);
  };

  const handleUpdate = async (data: any) => {
    const updated = await api.updateTask(taskId, data);
    setBriefing(updated);
  };

  const handleLink = async (targetKey: string, kind: string) => {
    await api.linkTasks(taskId, targetKey, kind);
    const updated = await api.getTaskBriefing(taskId);
    setBriefing(updated);
  };

  const handleSplit = async (subtasks: string[], sequential: boolean) => {
    await api.splitTask(taskId, subtasks, sequential);
    const updated = await api.getTaskBriefing(taskId);
    setBriefing(updated);
  };

  const handleCopyTicket = async () => {
    if (!briefing) return;
    const ok = await copyTextToClipboard(formatTaskBriefingMarkdown(briefing));
    if (ok) {
      setTicketCopied(true);
      setTimeout(() => setTicketCopied(false), 2000);
    }
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-[460px] bg-cad-surface border-l border-cad-border shadow-2xl flex flex-col z-20 overflow-hidden select-text">
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
            onClaim={handleClaim}
            onHandoff={handleHandoff}
            onUpdate={handleUpdate}
            onCopyTicket={handleCopyTicket}
            copyFeedback={ticketCopied}
            onDiscussInChat={onDiscussInChat}
          />

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs select-text">
            {/* Scope Coordinates & Collision Warnings */}
            <InspectorScope
              scope={briefing.task.scope}
              collisionWarnings={briefing.file_collision_warnings}
            />

            {/* Description & Acceptance Criteria */}
            <InspectorDescription
              description={briefing.task.description}
              acceptanceCriteria={briefing.task.acceptance_criteria}
            />

            {/* Execution Plan & Blueprint */}
            {briefing.task.plan && (
              <InspectorPlan
                plan={briefing.task.plan}
                ticketKey={briefing.task.ticket_key}
              />
            )}

            {/* Dependency Edges & Related Tasks */}
            <InspectorEdges
              relatedTasks={briefing.related_tasks_summary || []}
              ticketKey={briefing.task.ticket_key}
              onLink={handleLink}
              onSplit={handleSplit}
            />

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
