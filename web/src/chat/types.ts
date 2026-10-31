// A conversation held in the browser. Distinct from the Rust `ChatMessage`, which is the persisted
// ledger record in `.gaugeblock/chat/threads.jsonl`: nothing fetches one into the other, and matching
// names made a contract checker treat two unrelated models as one drifting contract (GB-238).
export interface ChatUiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  latencyMs?: number;
  modelUsed?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  taskKey?: string;
  messages: ChatUiMessage[];
}

