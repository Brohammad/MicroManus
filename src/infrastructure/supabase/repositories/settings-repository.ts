import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LlmSettings,
  PublicLlmSettings,
  SettingsRepository,
  UpsertLlmSettingsInput,
} from "@/domain/ports/settings-repository";

/** Lightweight reversible encoding — replace with KMS in production. */
export function encodeApiKey(plain: string): string {
  return Buffer.from(plain, "utf8").toString("base64");
}

export function decodeApiKey(encoded: string): string {
  return Buffer.from(encoded, "base64").toString("utf8");
}

function mapSettings(row: Record<string, unknown>): LlmSettings {
  return {
    userId: row.user_id as string,
    provider: row.provider as LlmSettings["provider"],
    modelKey: row.model_key as string,
    apiKey: decodeApiKey(row.api_key_encrypted as string),
    baseUrl: (row.base_url as string | null) ?? null,
    updatedAt: row.updated_at as string,
  };
}

export function createSupabaseSettingsRepository(
  db: SupabaseClient,
): SettingsRepository {
  return {
    async get(userId) {
      const { data, error } = await db
        .from("llm_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapSettings(data) : null;
    },

    async upsert(input: UpsertLlmSettingsInput) {
      const existing = await this.get(input.userId);
      const apiKey = input.apiKey
        ? encodeApiKey(input.apiKey)
        : existing
          ? encodeApiKey(existing.apiKey)
          : null;
      if (!apiKey) throw new Error("API key is required");

      const { data, error } = await db
        .from("llm_settings")
        .upsert(
          {
            user_id: input.userId,
            provider: input.provider,
            model_key: input.modelKey,
            api_key_encrypted: apiKey,
            base_url: input.baseUrl === undefined ? existing?.baseUrl ?? null : input.baseUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return mapSettings(data);
    },

    toPublic(settings): PublicLlmSettings | null {
      if (!settings) return null;
      return {
        provider: settings.provider,
        modelKey: settings.modelKey,
        hasApiKey: Boolean(settings.apiKey),
        baseUrlConfigured: Boolean(settings.baseUrl),
      };
    },
  };
}
