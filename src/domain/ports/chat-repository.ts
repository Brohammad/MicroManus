/** Framework-agnostic domain ports. Infrastructure implements these. */

import type { Chat, ChatMessage, CreateChatInput, AppendMessageInput } from "../chat/types";

export interface ChatRepository {
  listByUser(userId: string): Promise<Chat[]>;
  getById(chatId: string, userId: string): Promise<Chat | null>;
  create(input: CreateChatInput): Promise<Chat>;
  updateTitle(chatId: string, userId: string, title: string): Promise<void>;
  listMessages(chatId: string, userId: string): Promise<ChatMessage[]>;
  appendMessage(input: AppendMessageInput): Promise<ChatMessage>;
}
