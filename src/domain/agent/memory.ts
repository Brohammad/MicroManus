import type { ChatMessage } from "../chat/types";

export interface MemoryWindow {
  messages: ChatMessage[];
  truncated: boolean;
}

export interface AgentMemory {
  loadWindow(messages: ChatMessage[], maxMessages?: number): MemoryWindow;
}

/** v1: last-N window. Summarizer can plug in later without changing callers. */
export class WindowedMemory implements AgentMemory {
  loadWindow(messages: ChatMessage[], maxMessages = 40): MemoryWindow {
    if (messages.length <= maxMessages) {
      return { messages, truncated: false };
    }
    return {
      messages: messages.slice(-maxMessages),
      truncated: true,
    };
  }
}
