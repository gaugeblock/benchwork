import { useState, useEffect, useCallback } from 'react';
import type { Conversation, ChatMessage } from './types';

const STORAGE_KEY = 'gaugeblock.chat.conversations';
const ACTIVE_ID_KEY = 'gaugeblock.chat.activeId';

const DEFAULT_WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Welcome to the Conversational Systems Engineering Studio. I am your Planner and Spec Architect. Ask architecture questions, review specifications, or run /grill-me to resolve ambiguity holes before code generation.',
  timestamp: Date.now(),
};

function createInitialConversation(): Conversation {
  return {
    id: `conv-${Date.now()}`,
    title: 'Systems Engineering Studio',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [DEFAULT_WELCOME],
  };
}

export function useChatStorage() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [createInitialConversation()];
  });

  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(ACTIVE_ID_KEY);
      if (stored && conversations.some((c) => c.id === stored)) return stored;
    } catch {
      // fallback
    }
    return conversations[0]?.id || '';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      // localStorage quota or private mode
    }
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_ID_KEY, activeId);
    } catch {
      // fallback
    }
  }, [activeId]);

  const activeConversation =
    conversations.find((c) => c.id === activeId) || conversations[0];

  const createConversation = useCallback(
    (initialMessage?: ChatMessage, taskKey?: string, title?: string) => {
      const id = `conv-${Date.now()}`;
      const defaultTitle = title || (taskKey ? `Discussion on ${taskKey}` : 'New Architecture Chat');
      const messages = initialMessage ? [initialMessage] : [DEFAULT_WELCOME];

      const newConv: Conversation = {
        id,
        title: defaultTitle,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        taskKey,
        messages,
      };

      setConversations((prev) => [newConv, ...prev]);
      setActiveId(id);
      return id;
    },
    []
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (filtered.length === 0) {
          const fresh = createInitialConversation();
          setActiveId(fresh.id);
          return [fresh];
        }
        if (activeId === id) {
          setActiveId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeId]
  );

  const appendMessage = useCallback((convId: string, message: ChatMessage) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const updatedMessages = [...c.messages, message];
        let title = c.title;
        if (
          c.title === 'New Architecture Chat' &&
          message.role === 'user' &&
          c.messages.filter((m) => m.role === 'user').length === 0
        ) {
          title = message.text.slice(0, 36) + (message.text.length > 36 ? '...' : '');
        }
        return {
          ...c,
          title,
          updatedAt: Date.now(),
          messages: updatedMessages,
        };
      })
    );
  }, []);

  const clearCurrentMessages = useCallback(() => {
    if (!activeId) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: [DEFAULT_WELCOME] } : c))
    );
  }, [activeId]);

  return {
    conversations,
    activeId,
    activeConversation,
    setActiveId,
    createConversation,
    deleteConversation,
    appendMessage,
    clearCurrentMessages,
  };
}

