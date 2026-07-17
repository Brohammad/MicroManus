import OpenAI from "openai";
import {
  emptyUsage,
  type LLMProvider,
  type LlmCompleteRequest,
  type LlmCompleteResult,
  type NormalizedUsage,
} from "./types";

function parseUsage(raw: unknown): NormalizedUsage {
  const u = raw as {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    input_tokens?: number;
    output_tokens?: number;
    input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
  } | null;
  if (!u) return emptyUsage();
  const inputTokens = u.prompt_tokens ?? u.input_tokens ?? 0;
  const outputTokens = u.completion_tokens ?? u.output_tokens ?? 0;
  const cacheReadTokens =
    u.prompt_tokens_details?.cached_tokens ??
    u.input_tokens_details?.cached_tokens ??
    0;
  const cacheWriteTokens = u.input_tokens_details?.cache_write_tokens ?? 0;
  return { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens };
}

export function createOpenAICompatibleProvider(opts: {
  apiKey: string;
  baseURL: string;
}): LLMProvider {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseURL,
  });

  return {
    usage: parseUsage,

    async complete(req: LlmCompleteRequest): Promise<LlmCompleteResult> {
      const response = await client.chat.completions.create({
        model: req.model,
        messages: req.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        tools: req.tools as OpenAI.Chat.Completions.ChatCompletionTool[] | undefined,
        temperature: req.temperature ?? 0.2,
      });

      const choice = response.choices[0];
      const message = choice?.message;
      const toolCalls =
        message?.tool_calls?.map((tc) => ({
          id: tc.id,
          name: "function" in tc ? tc.function.name : "",
          arguments: "function" in tc ? tc.function.arguments : "{}",
        })) ?? [];

      return {
        content: message?.content ?? null,
        toolCalls,
        usage: parseUsage(response.usage),
      };
    },
  };
}

export function createOpenAIProvider(apiKey: string, baseUrl?: string | null) {
  return createOpenAICompatibleProvider({
    apiKey,
    baseURL: baseUrl || "https://api.openai.com/v1",
  });
}

export function createOpenRouterProvider(apiKey: string, baseUrl?: string | null) {
  return createOpenAICompatibleProvider({
    apiKey,
    baseURL: baseUrl || "https://openrouter.ai/api/v1",
  });
}

export function resolveProvider(opts: {
  provider: "openai" | "openrouter";
  apiKey: string;
  baseUrl?: string | null;
}): LLMProvider {
  if (opts.provider === "openrouter") {
    return createOpenRouterProvider(opts.apiKey, opts.baseUrl);
  }
  return createOpenAIProvider(opts.apiKey, opts.baseUrl);
}
