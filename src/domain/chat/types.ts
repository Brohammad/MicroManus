export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Chat {
  id: string;
  userId: string;
  title: string;
  modelKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  role: MessageRole;
  content: string;
  toolCalls: unknown | null;
  createdAt: string;
}

export interface CreateChatInput {
  userId: string;
  title?: string;
  modelKey?: string | null;
}

export interface AppendMessageInput {
  chatId: string;
  userId: string;
  role: MessageRole;
  content: string;
  toolCalls?: unknown | null;
}
