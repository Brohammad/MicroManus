import { runAgent, type AgentLlmPort } from "@/domain/agent/engine";
import type { AgentEvent } from "@/domain/agent/types";
import { createSearchTool } from "@/domain/agent/tools/search";
import { createFetchTool } from "@/domain/agent/tools/fetch";
import { createPdfTool } from "@/domain/agent/tools/pdf";
import { toolsToOpenAiDefinitions } from "@/domain/agent/tools/registry";
import { getCost } from "@/domain/pricing/getCost";
import { PRICING_VERSION, getModel } from "@/domain/pricing/catalog";
import type { ChatRepository } from "@/domain/ports/chat-repository";
import type { UsageRepository } from "@/domain/ports/usage-repository";
import type { LlmSettings } from "@/domain/ports/settings-repository";
import { resolveProvider } from "@/infrastructure/llm/openai";
import type { LLMProvider } from "@/infrastructure/llm/types";
import { createBraveSearchPort } from "@/infrastructure/brave/client";
import { createReadabilityFetchPort } from "@/infrastructure/fetch/readability";
import { createPdfReportPort } from "@/infrastructure/pdf/render";
import { BillingService } from "./billing-service";

function resolveWireModelId(settings: LlmSettings): string {
  const model = getModel(settings.modelKey);
  if (!model) throw new Error("Unknown model");
  return settings.provider === "openrouter"
    ? model.openrouterModelId
    : model.openaiModelId;
}

function createLlmPort(provider: LLMProvider, modelId: string): AgentLlmPort {
  return {
    async plan({ system, messages, tools }) {
      const defs = toolsToOpenAiDefinitions(tools);
      const result = await provider.complete({
        model: modelId,
        messages: [
          { role: "system", content: system },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant" | "tool" | "system",
            content: m.content,
          })),
        ],
        tools: defs,
      });

      if (result.toolCalls.length > 0) {
        const tc = result.toolCalls[0];
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        return {
          type: "tool",
          toolCalls: [{ id: tc.id, name: tc.name, arguments: args }],
          usage: result.usage,
        };
      }

      return {
        type: "final",
        answer: result.content ?? "",
        usage: result.usage,
      };
    },
  };
}

export class ChatService {
  constructor(
    private readonly chats: ChatRepository,
    private readonly usage: UsageRepository,
    private readonly billing: BillingService,
  ) {}

  list(userId: string) {
    return this.chats.listByUser(userId);
  }

  create(userId: string, modelKey?: string) {
    return this.chats.create({ userId, modelKey });
  }

  async getMessages(chatId: string, userId: string) {
    return this.chats.listMessages(chatId, userId);
  }

  async runTurn(opts: {
    userId: string;
    chatId: string;
    message: string;
    settings: LlmSettings;
    onEvent?: (event: AgentEvent) => void;
  }) {
    const chat = await this.chats.getById(opts.chatId, opts.userId);
    if (!chat) throw new Error("Chat not found");

    await this.billing.debitForChatTurn(opts.userId, opts.chatId);
    await this.chats.appendMessage({
      chatId: opts.chatId,
      userId: opts.userId,
      role: "user",
      content: opts.message,
    });

    if (!chat.title || chat.title === "New research") {
      const title =
        opts.message.length > 60
          ? `${opts.message.slice(0, 57)}...`
          : opts.message;
      await this.chats.updateTitle(opts.chatId, opts.userId, title);
    }

    const tools = [
      createSearchTool(createBraveSearchPort()),
      createFetchTool(createReadabilityFetchPort()),
      createPdfTool(createPdfReportPort()),
    ];

    const provider = resolveProvider({
      provider: opts.settings.provider,
      apiKey: opts.settings.apiKey,
      baseUrl: opts.settings.baseUrl,
    });
    const modelId = resolveWireModelId(opts.settings);
    const llm = createLlmPort(provider, modelId);

    const result = await runAgent(
      {
        tools,
        llm,
        loadMessages: (chatId, userId) => this.chats.listMessages(chatId, userId),
        onEvent: opts.onEvent,
      },
      {
        userId: opts.userId,
        chatId: opts.chatId,
        userMessage: opts.message,
        modelKey: opts.settings.modelKey,
      },
    );

    if (opts.onEvent && result.answer) {
      const chunkSize = 48;
      for (let i = 0; i < result.answer.length; i += chunkSize) {
        opts.onEvent({
          kind: "token",
          text: result.answer.slice(i, i + chunkSize),
        });
      }
    }

    await this.chats.appendMessage({
      chatId: opts.chatId,
      userId: opts.userId,
      role: "assistant",
      content: result.answer,
    });

    const cost = getCost(opts.settings.modelKey, result.usage, PRICING_VERSION);
    await this.usage.record({
      chatId: opts.chatId,
      userId: opts.userId,
      modelKey: opts.settings.modelKey,
      usage: result.usage,
      pricingVersion: cost.pricingVersion,
      costUsd: cost.totalUsd,
    });

    return result;
  }
}
