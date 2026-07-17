import type { AgentState } from "./types";

export function isTerminal(state: AgentState): boolean {
  return state.type === "FINAL";
}

export function nextAfterPlan(
  decision: { kind: "tool"; tool: AgentState & { type: "CALL_TOOL" } } | { kind: "final"; answer: string },
): AgentState {
  if (decision.kind === "final") {
    return { type: "FINAL", answer: decision.answer };
  }
  return decision.tool;
}

export function nextAfterObserve(_observation: unknown): AgentState {
  return { type: "PLAN" };
}
