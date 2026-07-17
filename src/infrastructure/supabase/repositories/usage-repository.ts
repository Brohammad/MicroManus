import type { SupabaseClient } from "@supabase/supabase-js";
import type { UsageRepository } from "@/domain/ports/usage-repository";
import type {
  ChatUsageSummary,
  RecordUsageInput,
  UsageEvent,
} from "@/domain/usage/types";

function mapUsage(row: Record<string, unknown>): UsageEvent {
  return {
    id: row.id as string,
    chatId: row.chat_id as string,
    userId: row.user_id as string,
    modelKey: row.model_key as string,
    inputTokens: row.input_tokens as number,
    outputTokens: row.output_tokens as number,
    cacheReadTokens: row.cache_read_tokens as number,
    cacheWriteTokens: row.cache_write_tokens as number,
    pricingVersion: row.pricing_version as string,
    costUsd: Number(row.cost_usd),
    createdAt: row.created_at as string,
  };
}

export function createSupabaseUsageRepository(
  db: SupabaseClient,
): UsageRepository {
  return {
    async record(input: RecordUsageInput) {
      const { data, error } = await db
        .from("usage_events")
        .insert({
          chat_id: input.chatId,
          user_id: input.userId,
          model_key: input.modelKey,
          input_tokens: input.usage.inputTokens,
          output_tokens: input.usage.outputTokens,
          cache_read_tokens: input.usage.cacheReadTokens,
          cache_write_tokens: input.usage.cacheWriteTokens,
          pricing_version: input.pricingVersion,
          cost_usd: input.costUsd,
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapUsage(data);
    },

    async summarizeByUser(userId) {
      const { data: chats, error } = await db
        .from("chats")
        .select("id, title, model_key, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const summaries: ChatUsageSummary[] = [];
      for (const chat of chats ?? []) {
        const { data: events, error: uErr } = await db
          .from("usage_events")
          .select("*")
          .eq("chat_id", chat.id)
          .eq("user_id", userId);
        if (uErr) throw uErr;
        const rows = events ?? [];
        summaries.push({
          chatId: chat.id,
          title: chat.title,
          modelKey: chat.model_key,
          inputTokens: rows.reduce((s, r) => s + r.input_tokens, 0),
          outputTokens: rows.reduce((s, r) => s + r.output_tokens, 0),
          cacheReadTokens: rows.reduce((s, r) => s + r.cache_read_tokens, 0),
          cacheWriteTokens: rows.reduce((s, r) => s + r.cache_write_tokens, 0),
          costUsd: rows.reduce((s, r) => s + Number(r.cost_usd), 0),
          createdAt: chat.created_at,
        });
      }
      return summaries;
    },

    async summarizeByChat(chatId, userId) {
      const all = await this.summarizeByUser(userId);
      return all.find((s) => s.chatId === chatId) ?? null;
    },
  };
}
