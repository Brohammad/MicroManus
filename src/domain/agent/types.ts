export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface Observation {
  toolCallId: string;
  name: string;
  content: string;
  ok: boolean;
}

export type AgentState =
  | { type: "START" }
  | { type: "PLAN" }
  | { type: "CALL_TOOL"; tool: ToolCall }
  | { type: "OBSERVE"; observation: Observation }
  | { type: "FINAL"; answer: string };

export type AgentEvent =
  | { kind: "state"; state: AgentState }
  | { kind: "token"; text: string }
  | { kind: "tool_start"; tool: ToolCall }
  | { kind: "tool_end"; observation: Observation }
  | { kind: "done"; answer: string }
  | { kind: "error"; message: string };

export interface AgentRunInput {
  userId: string;
  chatId: string;
  userMessage: string;
  modelKey: string;
  maxSteps?: number;
}

export interface AgentRunResult {
  answer: string;
  steps: number;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
  };
}
