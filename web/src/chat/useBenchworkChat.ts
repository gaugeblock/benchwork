import { useState, useCallback } from 'react';
import { useExternalStoreRuntime, ThreadMessageLike } from '@assistant-ui/react';

export interface UiViewportContext {
  active_panel: string;
  focused_task_key?: string;
  focused_doc_archetype?: string;
  focused_symbol?: string;
}

export interface StagedProposal {
  proposalId: string;
  toolName: string;
  payloadJson: string;
}

export interface BenchworkMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestampMs: number;
  proposal?: StagedProposal;
}

export function useBenchworkChat(viewport: UiViewportContext, role: string = 'planner') {
  const [messages, setMessages] = useState<BenchworkMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [threadId] = useState(() => `thread-${Date.now()}`);

  const appendUserMessage = useCallback(async (content: string) => {
    const userMsg: BenchworkMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestampMs: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsRunning(true);

    try {
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          user_message: content,
          viewport,
          role,
        }),
      });

      if (!response.body) throw new Error('No SSE response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let stagedProposal: StagedProposal | undefined;

      const assistantMsgId = `asst-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '', timestampMs: Date.now() },
      ]);

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const block of lines) {
          const match = block.match(/data:\s*(.*)/);
          if (!match) continue;
          try {
            const parsed = JSON.parse(match[1]);
            if (parsed.type === 'text_delta') {
              assistantText += parsed.delta;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantText } : m))
              );
            } else if (parsed.type === 'error') {
              assistantText += `\n\n⚠️ Error: ${parsed.message}`;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantText } : m))
              );
            } else if (parsed.type === 'tool_proposal') {
              stagedProposal = {
                proposalId: parsed.proposal_id,
                toolName: parsed.tool_name,
                payloadJson: parsed.payload_json,
              };
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId ? { ...m, proposal: stagedProposal } : m
                )
              );
            }
          } catch {
            // Ignore non-json chunks
          }
        }
      }
    } catch (err: any) {
      console.error('Chat stream failed:', err);
      const errMsgId = `asst-err-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: errMsgId, role: 'assistant', content: `⚠️ Connection error: ${err?.message || err}`, timestampMs: Date.now() },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [threadId, viewport, role]);

  const applyProposal = useCallback(
    async (proposalId: string, toolName: string, payloadJson: string, approved: boolean, editedPayload?: string) => {
      try {
        await fetch('/api/v1/chat/apply-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: threadId,
            proposal_id: proposalId,
            tool_name: toolName,
            payload_json: payloadJson,
            approved,
            edited_payload_json: editedPayload,
          }),
        });

        setMessages((prev) =>
          prev.map((m) => (m.proposal?.proposalId === proposalId ? { ...m, proposal: undefined } : m))
        );
      } catch (err) {
        console.error('Failed applying proposal:', err);
      }
    },
    [threadId]
  );

  const runtime = useExternalStoreRuntime({
    messages,
    isRunning,
    convertMessage: (msg: BenchworkMessage): ThreadMessageLike => ({
      id: msg.id,
      role: msg.role,
      content: [{ type: 'text', text: msg.content }],
    }),
    onNew: async (msg) => {
      const text = msg.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join('\n');
      await appendUserMessage(text);
    },
  });

  return {
    runtime,
    messages,
    isRunning,
    threadId,
    appendUserMessage,
    applyProposal,
  };
}

export const useBenjiChat = useBenchworkChat;
