import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatRepository } from "@/domain/ports/chat-repository";
import type {
  AppendMessageInput,
  Chat,
  ChatMessage,
  CreateChatInput,
} from "@/domain/chat/types";

function mapChat(row: Record<string, unknown>): Chat {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: row.title as string,
    modelKey: (row.model_key as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    chatId: row.chat_id as string,
    role: row.role as ChatMessage["role"],
    content: row.content as string,
    toolCalls: row.tool_calls ?? null,
    createdAt: row.created_at as string,
  };
}

export function createSupabaseChatRepository(db: SupabaseClient): ChatRepository {
  return {
    async listByUser(userId) {
      const { data, error } = await db
        .from("chats")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapChat);
    },

    async getById(chatId, userId) {
      const { data, error } = await db
        .from("chats")
        .select("*")
        .eq("id", chatId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapChat(data) : null;
    },

    async create(input: CreateChatInput) {
      const { data, error } = await db
        .from("chats")
        .insert({
          user_id: input.userId,
          title: input.title ?? "New research",
          model_key: input.modelKey ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapChat(data);
    },

    async updateTitle(chatId, userId, title) {
      const { error } = await db
        .from("chats")
        .update({ title, updated_at: new Date().toISOString() })
        .eq("id", chatId)
        .eq("user_id", userId);
      if (error) throw error;
    },

    async listMessages(chatId, userId) {
      const chat = await this.getById(chatId, userId);
      if (!chat) return [];
      const { data, error } = await db
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapMessage);
    },

    async appendMessage(input: AppendMessageInput) {
      const chat = await this.getById(input.chatId, input.userId);
      if (!chat) throw new Error("Chat not found");
      const { data, error } = await db
        .from("messages")
        .insert({
          chat_id: input.chatId,
          role: input.role,
          content: input.content,
          tool_calls: input.toolCalls ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      await db
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", input.chatId);
      return mapMessage(data);
    },
  };
}
