import { createAdminClient } from "@/infrastructure/supabase/admin";
import { createClient } from "@/infrastructure/supabase/server";
import { createSupabaseCreditRepository } from "@/infrastructure/supabase/repositories/credit-repository";
import { createSupabaseChatRepository } from "@/infrastructure/supabase/repositories/chat-repository";
import { createSupabaseUsageRepository } from "@/infrastructure/supabase/repositories/usage-repository";
import { createSupabaseSettingsRepository } from "@/infrastructure/supabase/repositories/settings-repository";
import { BillingService } from "@/services/billing-service";
import { ChatService } from "@/services/chat-service";
import { SettingsService } from "@/services/settings-service";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** User-scoped repos (RLS). */
export async function createUserServices() {
  const supabase = await createClient();
  const credits = createSupabaseCreditRepository(supabase);
  const chats = createSupabaseChatRepository(supabase);
  const usage = createSupabaseUsageRepository(supabase);
  const settings = createSupabaseSettingsRepository(supabase);
  const billing = new BillingService(credits);
  const chatService = new ChatService(chats, usage, billing);
  const settingsService = new SettingsService(settings);
  return { billing, chatService, settingsService, credits, usage, chats };
}

/** Service-role for webhooks / privileged ledger writes. */
export function createAdminServices() {
  const admin = createAdminClient();
  const credits = createSupabaseCreditRepository(admin);
  const billing = new BillingService(credits);
  return { billing, credits, admin };
}
