import React from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

interface ChatInputBarProps {
  input: string;
  loading: boolean;
  onChange: (val: string) => void;
  onSend: (customPrompt?: string) => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  input,
  loading,
  onChange,
  onSend,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-3 border-t border-cad-border bg-cad-surface/40 flex flex-col gap-2 shrink-0">
      <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
        <button
          type="button"
          onClick={() => onSend('/grill-me')}
          className="flex items-center gap-1 px-2 py-0.5 rounded border border-cad-amber/40 bg-cad-amber/10 text-cad-amber font-mono hover:bg-cad-amber/20 transition-colors shrink-0"
        >
          <Sparkles className="w-2.5 h-2.5" />
          /grill-me
        </button>
        <button
          type="button"
          onClick={() => onSend('Inspect active SPEC.md and check for ambiguity holes')}
          className="px-2 py-0.5 rounded border border-cad-border bg-cad-bg text-cad-muted hover:text-cad-text hover:border-cad-cyan/50 transition-colors shrink-0"
        >
          Review SPEC.md
        </button>
        <button
          type="button"
          onClick={() => onSend('Explain the neurosymbolic synthesis pipeline')}
          className="px-2 py-0.5 rounded border border-cad-border bg-cad-bg text-cad-muted hover:text-cad-text hover:border-cad-cyan/50 transition-colors shrink-0"
        >
          Pipeline Architecture
        </button>
      </div>

      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask an architecture question, explore tradeoffs, or type /grill-me... (Enter to send, Shift+Enter for newline)"
          className="flex-1 bg-cad-bg border border-cad-border rounded-lg p-2.5 text-cad-text placeholder-cad-muted/60 focus:outline-none focus:border-cad-cyan resize-none font-mono text-xs"
        />
        <button
          onClick={() => onSend()}
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-lg bg-cad-cyan text-black hover:bg-cad-cyan/90 disabled:opacity-40 transition-colors shrink-0"
          title="Send message"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

