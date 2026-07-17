import type {
  CreditBalance,
  CreditReason,
  CreditTransaction,
  GrantCreditsInput,
  DebitCreditsInput,
} from "../credits/types";

export interface CreditRepository {
  getBalance(userId: string): Promise<CreditBalance>;
  listTransactions(userId: string): Promise<CreditTransaction[]>;
  /** Idempotent when refId is set (unique reason+ref_id). */
  grant(input: GrantCreditsInput): Promise<CreditTransaction>;
  /** Fails if balance would go negative. */
  debit(input: DebitCreditsInput): Promise<CreditTransaction>;
  markUnlocked(userId: string): Promise<void>;
}

export type { CreditReason };
