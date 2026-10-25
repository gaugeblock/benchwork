import React from 'react';
import { Bot, User, Terminal, Copy, Check, Cpu, Clock } from 'lucide-react';
import type { ChatMessage } from '../../chat/types';

interface ChatMessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  loading,
  copiedId,
  onCopy,
  bottomRef,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs font-sans">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        const isSystem = msg.role === 'system';

        return (
          <div
            key={msg.id}
            className={`flex gap-3 group max-w-4xl ${isUser ? 'ml-auto flex-row-reverse max-w-xl' : 'mr-auto w-full'}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                isUser
                  ? 'bg-cad-cyan/10 border-cad-cyan/30 text-cad-cyan'
                  : isSystem
                    ? 'bg-cad-amber/10 border-cad-amber/30 text-cad-amber'
                    : 'bg-cad-surface border-cad-border text-cad-text'
              }`}
            >
              {isUser ? <User className="w-4 h-4" /> : isSystem ? <Terminal className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`flex flex-col gap-1.5 p-3 rounded-lg border ${
                isUser
                  ? 'bg-cad-cyan/10 border-cad-cyan/30 text-cad-text'
                  : isSystem
                    ? 'bg-cad-amber/5 border-cad-amber/30 text-cad-amber/90 font-mono text-[11px] whitespace-pre-wrap'
                    : 'bg-cad-surface border-cad-border text-cad-text'
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-[10px] text-cad-muted">
                <span className="font-semibold uppercase tracking-wider">
                  {isUser ? 'You' : isSystem ? 'System Briefing' : 'Planner & Architect'}
                </span>
                <div className="flex items-center gap-2">
                  {msg.modelUsed && (
                    <span className="flex items-center gap-1 font-mono text-[9px] bg-cad-bg px-1.5 py-0.5 rounded border border-cad-border">
                      <Cpu className="w-2.5 h-2.5 text-cad-cyan" />
                      {msg.modelUsed}
                    </span>
                  )}
                  {msg.latencyMs !== undefined && (
                    <span className="flex items-center gap-0.5 font-mono text-[9px] text-cad-muted">
                      <Clock className="w-2.5 h-2.5" />
                      {msg.latencyMs}ms
                    </span>
                  )}
                  <button
                    onClick={() => onCopy(msg.id, msg.text)}
                    className="opacity-0 group-hover:opacity-100 hover:text-cad-cyan transition-opacity p-0.5"
                    title="Copy message to clipboard"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-cad-emerald" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="leading-relaxed whitespace-pre-wrap select-text font-mono text-[12px]">
                {msg.text}
              </div>
            </div>
          </div>
        );
      })}

      {loading && (
        <div className="flex gap-3 mr-auto items-center text-cad-cyan font-mono text-xs p-2">
          <Bot className="w-4 h-4 animate-bounce" />
          <span>Synthesizing response from Planner model...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};

