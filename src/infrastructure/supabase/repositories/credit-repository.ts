import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreditRepository } from "@/domain/ports/credit-repository";
import type {
  CreditBalance,
  CreditTransaction,
  DebitCreditsInput,
  GrantCreditsInput,
} from "@/domain/credits/types";
import { assertNonZeroDelta } from "@/domain/credits/rules";

function mapTx(row: Record<string, unknown>): CreditTransaction {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    delta: row.delta as number,
    reason: row.reason as CreditTransaction["reason"],
    refId: (row.ref_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function createSupabaseCreditRepository(
  db: SupabaseClient,
): CreditRepository {
  return {
    async getBalance(userId): Promise<CreditBalance> {
      const { data, error } = await db.rpc("get_credit_balance", {
        p_user_id: userId,
      });
      if (error) throw error;
      return { userId, balance: (data as number) ?? 0 };
    },

    async listTransactions(userId) {
      const { data, error } = await db
        .from("credit_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapTx);
    },

    async grant(input: GrantCreditsInput) {
      assertNonZeroDelta(input.delta);
      const { data, error } = await db
        .from("credit_transactions")
        .insert({
          user_id: input.userId,
          delta: input.delta,
          reason: input.reason,
          ref_id: input.refId,
        })
        .select("*")
        .single();
      if (error) {
        if (error.code === "23505") {
          const { data: existing } = await db
            .from("credit_transactions")
            .select("*")
            .eq("reason", input.reason)
            .eq("ref_id", input.refId)
            .single();
          if (existing) return mapTx(existing);
        }
        throw error;
      }
      return mapTx(data);
    },

    async debit(input: DebitCreditsInput) {
      assertNonZeroDelta(input.delta);
      if (input.delta >= 0) throw new Error("Debit delta must be negative");

      const { data: balance } = await db.rpc("get_credit_balance", {
        p_user_id: input.userId,
      });
      if (((balance as number) ?? 0) + input.delta < 0) {
        throw new Error("Insufficient credits");
      }

      const { data, error } = await db
        .from("credit_transactions")
        .insert({
          user_id: input.userId,
          delta: input.delta,
          reason: input.reason,
          ref_id: input.refId,
        })
        .select("*")
        .single();
      if (error) throw error;
      return mapTx(data);
    },

    async markUnlocked(userId) {
      const { error } = await db
        .from("profiles")
        .update({ unlocked_at: new Date().toISOString() })
        .eq("id", userId)
        .is("unlocked_at", null);
      if (error) throw error;
    },
  };
}
