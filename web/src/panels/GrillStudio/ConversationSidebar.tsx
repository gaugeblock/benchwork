import React from 'react';
import { Plus, MessageSquare, Trash2, Search, Tag } from 'lucide-react';
import type { Conversation } from '../../chat/types';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}) => {
  const [filter, setFilter] = React.useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(filter.toLowerCase()) ||
    (c.taskKey && c.taskKey.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="w-56 shrink-0 border-r border-cad-border bg-cad-bg/60 flex flex-col h-full text-xs">
      <div className="p-2.5 border-b border-cad-border flex items-center justify-between gap-1">
        <button
          onClick={onNewChat}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-cad-cyan/10 border border-cad-cyan/40 text-cad-cyan font-semibold hover:bg-cad-cyan/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="p-2 border-b border-cad-border/60">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-cad-surface border border-cad-border rounded">
          <Search className="w-3 h-3 text-cad-muted shrink-0" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-transparent text-cad-text placeholder-cad-muted/60 focus:outline-none text-[11px]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
        {filtered.map((conv) => {
          const isActive = conv.id === activeId;
          return (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`group flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${
                isActive
                  ? 'bg-cad-surface border-cad-cyan/40 text-cad-text'
                  : 'border-transparent text-cad-muted hover:bg-cad-surface/50 hover:text-cad-text'
              }`}
            >
              <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cad-cyan' : 'text-cad-muted'}`} />
                <div className="truncate flex flex-col">
                  <span className="truncate font-medium text-[11px]">{conv.title}</span>
                  {conv.taskKey && (
                    <span className="flex items-center gap-0.5 text-[9px] text-cad-cyan/80 font-mono">
                      <Tag className="w-2.5 h-2.5" />
                      {conv.taskKey}
                    </span>
                  )}
                </div>
              </div>

              {conversations.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  title="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 p-1 text-cad-muted hover:text-cad-crimson transition-opacity shrink-0 ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

