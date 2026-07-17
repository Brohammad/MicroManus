export interface NormalizedUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface LlmToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LlmCompleteRequest {
  model: string;
  messages: LlmMessage[];
  tools?: LlmToolDefinition[];
  temperature?: number;
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface LlmCompleteResult {
  content: string | null;
  toolCalls: LlmToolCall[];
  usage: NormalizedUsage;
}

export interface LLMProvider {
  complete(req: LlmCompleteRequest): Promise<LlmCompleteResult>;
  usage(raw: unknown): NormalizedUsage;
}

export function emptyUsage(): NormalizedUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
}
