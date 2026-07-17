import { isTerminal, nextAfterObserve } from "./machine";
import { WindowedMemory } from "./memory";
import { SYSTEM_PROMPT } from "./prompts/system";
import type { AnyTool } from "./tools/types";
import type {
  AgentEvent,
  AgentRunInput,
  AgentRunResult,
  AgentState,
  Observation,
  ToolCall,
} from "./types";
import type { ChatMessage } from "../chat/types";

export interface LlmTurnRequest {
  system: string;
  messages: { role: string; content: string }[];
  tools: AnyTool[];
}

export interface LlmTurnResult {
  type: "tool" | "final";
  toolCalls?: ToolCall[];
  answer?: string;
  usage: AgentRunResult["usage"];
}

export interface AgentLlmPort {
  plan(req: LlmTurnRequest): Promise<LlmTurnResult>;
}

export interface AgentEngineDeps {
  tools: AnyTool[];
  llm: AgentLlmPort;
  loadMessages: (chatId: string, userId: string) => Promise<ChatMessage[]>;
  onEvent?: (event: AgentEvent) => void;
}

function emit(deps: AgentEngineDeps, event: AgentEvent) {
  deps.onEvent?.(event);
}

export async function runAgent(
  deps: AgentEngineDeps,
  input: AgentRunInput,
): Promise<AgentRunResult> {
  const maxSteps = input.maxSteps ?? 8;
  const memory = new WindowedMemory();
  const history = await deps.loadMessages(input.chatId, input.userId);
  const window = memory.loadWindow([
    ...history,
    {
      id: "pending",
      chatId: input.chatId,
      role: "user",
      content: input.userMessage,
      toolCalls: null,
      createdAt: new Date().toISOString(),
    },
  ]);

  const conversation: { role: string; content: string }[] = window.messages.map(
    (m) => ({ role: m.role, content: m.content }),
  );

  let state: AgentState = { type: "START" };
  emit(deps, { kind: "state", state });
  state = { type: "PLAN" };
  emit(deps, { kind: "state", state });

  let steps = 0;
  const usageAcc = {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };

  while (!isTerminal(state) && steps < maxSteps) {
    steps += 1;

    if (state.type === "PLAN") {
      const turn = await deps.llm.plan({
        system: SYSTEM_PROMPT,
        messages: conversation,
        tools: deps.tools,
      });
      usageAcc.inputTokens += turn.usage.inputTokens;
      usageAcc.outputTokens += turn.usage.outputTokens;
      usageAcc.cacheReadTokens += turn.usage.cacheReadTokens;
      usageAcc.cacheWriteTokens += turn.usage.cacheWriteTokens;

      if (turn.type === "final" && turn.answer) {
        state = { type: "FINAL", answer: turn.answer };
        emit(deps, { kind: "state", state });
        emit(deps, { kind: "done", answer: turn.answer });
        break;
      }

      const tool = turn.toolCalls?.[0];
      if (!tool) {
        state = {
          type: "FINAL",
          answer: turn.answer ?? "I could not complete this research step.",
        };
        emit(deps, { kind: "state", state });
        break;
      }

      state = { type: "CALL_TOOL", tool };
      emit(deps, { kind: "state", state });
      emit(deps, { kind: "tool_start", tool });
      continue;
    }

    if (state.type === "CALL_TOOL") {
      const toolCall = state.tool;
      const toolDef = deps.tools.find((t) => t.name === toolCall.name);
      let observation: Observation;
      if (!toolDef) {
        observation = {
          toolCallId: toolCall.id,
          name: toolCall.name,
          content: `Unknown tool: ${toolCall.name}`,
          ok: false,
        };
      } else {
        const parsed = toolDef.schema.safeParse(toolCall.arguments);
        if (!parsed.success) {
          observation = {
            toolCallId: toolCall.id,
            name: toolCall.name,
            content: `Invalid tool arguments: ${parsed.error.message}`,
            ok: false,
          };
        } else {
          const result = await toolDef.execute(parsed.data, {
            userId: input.userId,
            chatId: input.chatId,
          });
          observation = {
            toolCallId: toolCall.id,
            name: toolCall.name,
            content: result.content,
            ok: result.ok,
          };
        }
      }

      conversation.push({
        role: "assistant",
        content: `Calling tool ${toolCall.name}(${JSON.stringify(toolCall.arguments)})`,
      });
      conversation.push({
        role: "tool",
        content: observation.content,
      });

      state = { type: "OBSERVE", observation };
      emit(deps, { kind: "state", state });
      emit(deps, { kind: "tool_end", observation });
      continue;
    }

    if (state.type === "OBSERVE") {
      state = nextAfterObserve(state.observation);
      emit(deps, { kind: "state", state });
      continue;
    }

    break;
  }

  if (!isTerminal(state)) {
    const answer =
      "Reached the research step limit. Please refine your question or continue in a follow-up.";
    state = { type: "FINAL", answer };
    emit(deps, { kind: "done", answer });
  }

  const answer = state.type === "FINAL" ? state.answer : "";
  return { answer, steps, usage: usageAcc };
}
