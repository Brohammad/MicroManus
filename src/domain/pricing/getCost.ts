import { getModel, PRICING_VERSION, type ModelPricing } from "./catalog";

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface CostBreakdown {
  inputUsd: number;
  outputUsd: number;
  cacheReadUsd: number;
  cacheWriteUsd: number;
  totalUsd: number;
  pricingVersion: string;
}

function perMillion(tokens: number, rate: number): number {
  return (tokens / 1_000_000) * rate;
}

export function getCost(
  modelKey: string,
  usage: TokenUsage,
  pricingVersion: string = PRICING_VERSION,
  pricingOverride?: ModelPricing,
): CostBreakdown {
  const model = getModel(modelKey);
  const pricing = pricingOverride ?? model?.pricing;
  if (!pricing) {
    throw new Error(`Unknown model for pricing: ${modelKey}`);
  }

  const uncachedInput = Math.max(0, usage.inputTokens - usage.cacheReadTokens);
  const inputUsd = perMillion(uncachedInput, pricing.input);
  const cacheReadUsd = perMillion(usage.cacheReadTokens, pricing.cacheRead);
  const cacheWriteUsd = perMillion(usage.cacheWriteTokens, pricing.cacheWrite);
  const outputUsd = perMillion(usage.outputTokens, pricing.output);
  const totalUsd = inputUsd + outputUsd + cacheReadUsd + cacheWriteUsd;

  return {
    inputUsd,
    outputUsd,
    cacheReadUsd,
    cacheWriteUsd,
    totalUsd,
    pricingVersion,
  };
}
