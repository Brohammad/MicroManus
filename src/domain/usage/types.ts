import type { TokenUsage } from "../pricing/getCost";

export interface UsageEvent {
  id: string;
  chatId: string;
  userId: string;
  modelKey: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  pricingVersion: string;
  costUsd: number;
  createdAt: string;
}

export interface RecordUsageInput {
  chatId: string;
  userId: string;
  modelKey: string;
  usage: TokenUsage;
  pricingVersion: string;
  costUsd: number;
}

export interface ChatUsageSummary {
  chatId: string;
  title: string;
  modelKey: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  createdAt: string;
}
