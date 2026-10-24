import React, { useState, useEffect, useRef } from 'react';
import type { TaskNode } from '../../types';
import { api } from '../../api/client';
import { Send, Bot, User, Sparkles, Loader2, Copy, Check, Terminal } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  latencyMs?: number;
  modelUsed?: string;
}

interface EngineerChatProps {
  initialChatTask?: TaskNode | null;
  onClearInitialTask?: () => void;
}

export const EngineerChat: React.FC<EngineerChatProps> = ({
  initialChatTask,
  onClearInitialTask,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialChatTask) {
      const taskContext = `[Context Briefing for ${initialChatTask.ticket_key}]\nTitle: ${initialChatTask.title}\nStatus: ${initialChatTask.status} | Priority: P${initialChatTask.priority}\nKind: ${initialChatTask.kind}\nScope: ${initialChatTask.scope.crate_name || 'workspace'}\n\nAsk me any architecture question, explore tradeoffs, or type /grill-me to resolve ambiguity holes.`;
      setMessages([
        {
          id: 'init-task',
          role: 'system',
          text: taskContext,
          timestamp: Date.now(),
        },
      ]);
    } else if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: 'Welcome to the Conversational Systems Engineering Studio. I am your Planner and Spec Architect. Ask architecture questions, review specifications, or run /grill-me to resolve ambiguity holes before code generation.',
          timestamp: Date.now(),
        },
      ]);
    }
  }, [initialChatTask]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
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
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'system',
        text: `Inference failed: ${err instanceof Error ? err.message : String(err)}. Verify sawhorse.toml model slots in Panel 4.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-cad-bg overflow-hidden select-text">
      {/* Stream messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          const isSystem = m.role === 'system';

          if (isSystem) {
            return (
              <div key={m.id} className="p-3 rounded border border-cad-cyan/30 bg-cad-cyan/10 text-cad-text text-xs font-mono whitespace-pre-wrap leading-relaxed flex items-start gap-2">
                <Terminal className="w-4 h-4 text-cad-cyan shrink-0 mt-0.5" />
                <div className="flex-1">{m.text}</div>
                {onClearInitialTask && (
                  <button onClick={onClearInitialTask} className="text-[10px] text-cad-muted hover:text-cad-text">Dismiss</button>
                )}
              </div>
            );
          }

          return (
            <div key={m.id} className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'self-end items-end' : 'self-start items-start'}`}>
              <div className="flex items-center gap-1.5 text-[10px] text-cad-muted px-1">
                {isUser ? <User className="w-3 h-3 text-cad-cyan" /> : <Bot className="w-3 h-3 text-purple-400" />}
                <span>{isUser ? 'Engineer' : 'Planner LLM'}</span>
                {m.latencyMs !== undefined && (
                  <span className="font-mono text-zinc-500">({m.latencyMs}ms{m.modelUsed ? ` • ${m.modelUsed}` : ''})</span>
                )}
              </div>
              <div className={`group relative p-3 rounded text-xs leading-relaxed ${
                isUser
                  ? 'bg-cad-cyan/20 border border-cad-cyan/40 text-cad-text'
                  : 'bg-cad-surface border border-cad-border text-cad-text shadow-sm'
              }`}>
                <div className="whitespace-pre-wrap font-sans">{m.text}</div>
                <button
                  onClick={() => handleCopy(m.id, m.text)}
                  className="absolute top-2 right-2 p-1 rounded bg-cad-bg/70 opacity-0 group-hover:opacity-100 hover:text-cad-cyan text-cad-muted transition-all"
                  title="Copy message text"
                >
                  {copiedId === m.id ? <Check className="w-3 h-3 text-cad-emerald" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-cad-muted p-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cad-cyan" />
            <span>Consulting Planner LLM & active spec...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Pills & Input Bar */}
      <div className="p-3 border-t border-cad-border bg-cad-surface/60 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-cad-muted uppercase font-bold tracking-wider mr-1">Quick:</span>
          <button
            onClick={() => handleSend('/grill-me Check active specifications for ambiguities, missing schemas, or boundary holes')}
            className="px-2 py-0.5 rounded-full border border-cad-amber/40 bg-cad-amber/10 text-cad-amber text-[10px] font-semibold hover:bg-cad-amber/20 transition-all flex items-center gap-1"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>/grill-me</span>
          </button>
          <button
            onClick={() => handleSend('/recon Inspect AST symbols and shared contracts across member crates')}
            className="px-2 py-0.5 rounded-full border border-cad-cyan/40 bg-cad-cyan/10 text-cad-cyan text-[10px] font-semibold hover:bg-cad-cyan/20 transition-all"
          >
            <span>/recon</span>
          </button>
          <button
            onClick={() => handleSend('Suggest the optimal module architecture and file boundaries for this task')}
            className="px-2 py-0.5 rounded-full border border-purple-500/40 bg-purple-500/10 text-purple-300 text-[10px] font-semibold hover:bg-purple-500/20 transition-all"
          >
            <span>Architecture Review</span>
          </button>
          <button
            onClick={() => handleSend('/audit-docs Audit the 9-Document Architecture against code AST and git history')}
            className="px-2 py-0.5 rounded-full border border-cad-emerald/40 bg-cad-emerald/10 text-cad-emerald text-[10px] font-semibold hover:bg-cad-emerald/20 transition-all"
          >
            <span>/audit-docs</span>
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask architecture questions, explore tradeoffs, or type /grill-me..."
            className="flex-1 bg-cad-bg border border-cad-border rounded px-3 py-2 text-xs text-cad-text placeholder-cad-muted focus:outline-none focus:border-cad-cyan"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-3 py-2 rounded bg-cad-cyan text-cad-bg font-bold text-xs hover:bg-cad-cyan/90 disabled:opacity-40 transition-all flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

