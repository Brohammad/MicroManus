export type LlmProviderId = "openrouter" | "openai";

export interface LlmSettings {
  userId: string;
  provider: LlmProviderId;
  modelKey: string;
  /** Decrypted only in infrastructure/services — never sent to clients. */
  apiKey: string;
  /** Advanced optional OpenAI-compatible base URL. */
  baseUrl: string | null;
  updatedAt: string;
}

export interface PublicLlmSettings {
  provider: LlmProviderId;
  modelKey: string;
  hasApiKey: boolean;
  baseUrlConfigured: boolean;
}

export interface UpsertLlmSettingsInput {
  userId: string;
  provider: LlmProviderId;
  modelKey: string;
  apiKey?: string;
  baseUrl?: string | null;
}

export interface SettingsRepository {
  get(userId: string): Promise<LlmSettings | null>;
  upsert(input: UpsertLlmSettingsInput): Promise<LlmSettings>;
  toPublic(settings: LlmSettings | null): PublicLlmSettings | null;
}
