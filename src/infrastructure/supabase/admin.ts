import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for privileged SERVER operations only:
 * coupon/Stripe ledger grants, PDF storage uploads.
 * Never import this module from client components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase admin credentials");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
