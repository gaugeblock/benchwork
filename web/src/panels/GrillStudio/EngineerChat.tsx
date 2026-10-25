import React, { useState, useEffect, useRef } from 'react';
import type { TaskNode } from '../../types';
import type { ChatMessage } from '../../chat/types';
import { useChatStorage } from '../../chat/useChatStorage';
import { ConversationSidebar } from './ConversationSidebar';
import { ChatMessageList } from './ChatMessageList';
import { ChatInputBar } from './ChatInputBar';
import { api } from '../../api/client';
import { MessageSquare, RotateCcw, PanelLeftClose, PanelLeft } from 'lucide-react';

interface EngineerChatProps {
  initialChatTask?: TaskNode | null;
  onClearInitialTask?: () => void;
}

export const EngineerChat: React.FC<EngineerChatProps> = ({
  initialChatTask,
  onClearInitialTask,
}) => {
  const {
    conversations,
    activeId,
    activeConversation,
    setActiveId,
    createConversation,
    deleteConversation,
    appendMessage,
    clearCurrentMessages,
  } = useChatStorage();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialChatTask) {
      const existing = conversations.find((c) => c.taskKey === initialChatTask.ticket_key);
      if (existing) {
        setActiveId(existing.id);
      } else {
        const briefingMsg: ChatMessage = {
          id: `init-${Date.now()}`,
          role: 'system',
          text: `[Context Briefing for ${initialChatTask.ticket_key}]\nTitle: ${initialChatTask.title}\nStatus: ${initialChatTask.status} | Priority: P${initialChatTask.priority}\nKind: ${initialChatTask.kind}\nScope: ${initialChatTask.scope.crate_name || 'workspace'}\n\nAsk architecture questions, explore tradeoffs, or type /grill-me to resolve ambiguity holes.`,
          timestamp: Date.now(),
        };
        createConversation(briefingMsg, initialChatTask.ticket_key, `Discussion on ${initialChatTask.ticket_key}`);
      }
      onClearInitialTask?.();
    }
  }, [initialChatTask]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading || !activeConversation) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    appendMessage(activeConversation.id, userMsg);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const res = await api.pingModel('Planner', textToSend);
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        text: res.text,
        timestamp: Date.now(),
        latencyMs: res.latency_ms,
        modelUsed: res.model_used,
      };
      appendMessage(activeConversation.id, assistantMsg);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'system',
        text: `Inference failed: ${err instanceof Error ? err.message : String(err)}. Verify sawhorse.toml model slots in Panel 4.`,
        timestamp: Date.now(),
      };
      appendMessage(activeConversation.id, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard access fallback
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-cad-bg">
      {sidebarOpen && (
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNewChat={() => createConversation()}
          onDelete={deleteConversation}
        />
      )}

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Studio Top Bar */}
        <div className="h-10 border-b border-cad-border bg-cad-surface/60 flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-cad-muted hover:text-cad-text p-1 rounded hover:bg-cad-surface transition-colors"
              title={sidebarOpen ? 'Hide conversations sidebar' : 'Show conversations sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
            </button>
            <div className="h-3 w-px bg-cad-border" />
            <MessageSquare className="w-3.5 h-3.5 text-cad-cyan" />
            <span className="font-semibold text-cad-text truncate max-w-sm">
              {activeConversation?.title || 'Systems Engineering Studio'}
            </span>
            <span className="text-[10px] text-cad-muted font-mono">
              ({activeConversation?.messages.length || 0} messages)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearCurrentMessages}
              className="flex items-center gap-1 text-[11px] text-cad-muted hover:text-cad-text px-2 py-1 rounded hover:bg-cad-surface border border-transparent hover:border-cad-border transition-colors"
              title="Reset current chat"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <ChatMessageList
          messages={activeConversation?.messages || []}
          loading={loading}
          copiedId={copiedId}
          onCopy={handleCopy}
          bottomRef={bottomRef}
        />

        {/* Persistent Input Bar */}
        <ChatInputBar
          input={input}
          loading={loading}
          onChange={setInput}
          onSend={handleSend}
        />
      </div>
    </div>
  );
};
