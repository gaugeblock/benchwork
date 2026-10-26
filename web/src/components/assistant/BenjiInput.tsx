import React, { useState, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { AutocompletePillBar } from '../../chat/AutocompletePillBar';

interface BenjiInputProps {
  onSend: (text: string) => void;
  isRunning: boolean;
  focusedTaskKey?: string;
}

export const BenjiInput: React.FC<BenjiInputProps> = ({
  onSend,
  isRunning,
  focusedTaskKey,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isRunning) return;
    setInput('');
    onSend(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePillSelect = (snippet: string) => {
    setInput((prev) => prev + snippet);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-cad-border bg-cad-surface flex flex-col shrink-0 font-mono text-xs">
      <AutocompletePillBar onSelect={handlePillSelect} focusedTaskKey={focusedTaskKey} />

      <form onSubmit={handleSubmit} className="p-2.5 flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Benji (/plan, @doc:SPEC, @task:GB-1)..."
          rows={2}
          className="flex-1 bg-cad-bg border border-cad-border rounded p-2 text-cad-text placeholder-cad-muted focus:border-cad-cyan focus:outline-none resize-none font-mono text-xs leading-relaxed"
          disabled={isRunning}
        />

        <button
          type="submit"
          disabled={!input.trim() || isRunning}
          className="p-2.5 rounded bg-cad-cyan/20 border border-cad-cyan/40 text-cad-cyan hover:bg-cad-cyan/30 disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0"
          title="Send message (Enter)"
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};

