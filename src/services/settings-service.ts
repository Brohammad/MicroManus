import { listPublicModels, getModel } from "@/domain/pricing/catalog";
import type { SettingsRepository } from "@/domain/ports/settings-repository";
import type { LlmProviderId } from "@/domain/ports/settings-repository";

export class SettingsService {
  constructor(private readonly settings: SettingsRepository) {}

  listModels() {
    return listPublicModels();
  }

  listProviders(): { id: LlmProviderId; label: string }[] {
    return [
      { id: "openrouter", label: "OpenRouter" },
      { id: "openai", label: "OpenAI" },
    ];
  }

  async getPublic(userId: string) {
    const settings = await this.settings.get(userId);
    return this.settings.toPublic(settings);
  }

  async upsert(
    userId: string,
    input: {
      provider: LlmProviderId;
      modelKey: string;
      apiKey?: string;
      baseUrl?: string | null;
    },
  ) {
    if (!getModel(input.modelKey)) {
      throw new Error("Unknown model");
    }
    const saved = await this.settings.upsert({ userId, ...input });
    return this.settings.toPublic(saved);
  }

  async getPrivate(userId: string) {
    return this.settings.get(userId);
  }
}
