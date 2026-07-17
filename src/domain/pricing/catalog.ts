export const PRICING_VERSION = "2026-07-17";

/** USD per 1M tokens */
export interface ModelPricing {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export interface ModelCatalogEntry {
  key: string;
  label: string;
  /** Wire id sent to OpenAI-compatible APIs (OpenRouter / OpenAI). */
  openrouterModelId: string;
  openaiModelId: string;
  pricing: ModelPricing;
}

export const MODEL_CATALOG: ModelCatalogEntry[] = [
  {
    key: "gpt-5.4",
    label: "GPT-5.4",
    openrouterModelId: "openai/gpt-5.4",
    openaiModelId: "gpt-5.4",
    pricing: { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 0 },
  },
  {
    key: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    openrouterModelId: "anthropic/claude-sonnet-4.6",
    openaiModelId: "claude-sonnet-4-6",
    pricing: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  },
  {
    key: "claude-opus-4-6",
    label: "Claude Opus 4.6",
    openrouterModelId: "anthropic/claude-opus-4.6",
    openaiModelId: "claude-opus-4-6",
    pricing: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  },
  {
    key: "kimi-k2.5",
    label: "Kimi K2.5",
    openrouterModelId: "moonshotai/kimi-k2.5",
    openaiModelId: "kimi-k2.5",
    pricing: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
  },
];

export function getModel(key: string): ModelCatalogEntry | undefined {
  return MODEL_CATALOG.find((m) => m.key === key);
}

export function listPublicModels() {
  return MODEL_CATALOG.map(({ key, label }) => ({ key, label }));
}
