# Plan: GB-40 — Persistent Multi-Conversation AI Engineer Chat Studio

## Problem Statement
Currently, chat in Benchwork resets when switching between panels because component state is unmounted. Furthermore, chat only supports a single ephemeral thread with no persistence across panel transitions or page reloads, and lacks first-class multi-conversation management (like ChatGPT, Gemini, Cline, Antigravity).

## Architecture & Implementation Steps

### Step 1: Chat Types & Storage Engine (`web/src/chat/`)
- Define `ChatMessage`, `Conversation` models in `web/src/chat/types.ts`.
- Implement `useChatStorage.ts` hook backed by `localStorage` (`gaugeblock.chat.conversations`, `gaugeblock.chat.activeId`).
- Support `createConversation`, `switchConversation`, `deleteConversation`, `appendMessage`, `clearCurrentConversation`.
- Automatically title conversations from the first user prompt or attached task key.

### Step 2: Modular Chat Studio Components (`web/src/panels/GrillStudio/`)
- `ConversationSidebar.tsx`: Sidebar with "New Chat", search/filter, conversation list with active indicators, timestamps, message counts, and delete actions. Collapsible to maximize reading space.
- `ChatMessageList.tsx`: Rendering of user, assistant, and system briefing messages with copy-to-clipboard, model badge, latency, and timestamp.
- `ChatInputBar.tsx`: Resizable textarea, keyboard shortcuts (Enter to send, Shift+Enter for newline), quick command pills (`/grill-me`, `/spec`, `/verify`).
- `EngineerChat.tsx`: Integration orchestrator maintaining unmount resilience and task briefing context.

### Step 3: Verification & Polish
- Ensure every single `.ts` and `.tsx` file is strictly <= 250 LOC.
- Build production web assets (`npm run build`).
- Verify task in Storypole (`storypole verify GB-40`).
- Merge to `main`.

