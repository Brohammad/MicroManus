import type { RecordUsageInput, UsageEvent, ChatUsageSummary } from "../usage/types";

export interface UsageRepository {
  record(input: RecordUsageInput): Promise<UsageEvent>;
  summarizeByUser(userId: string): Promise<ChatUsageSummary[]>;
  summarizeByChat(chatId: string, userId: string): Promise<ChatUsageSummary | null>;
}
