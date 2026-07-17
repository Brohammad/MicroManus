export type CreditReason = "coupon" | "stripe" | "chat" | "refund";

export interface CreditTransaction {
  id: string;
  userId: string;
  delta: number;
  reason: CreditReason;
  refId: string | null;
  createdAt: string;
}

export interface CreditBalance {
  userId: string;
  balance: number;
}

export interface GrantCreditsInput {
  userId: string;
  delta: number;
  reason: CreditReason;
  refId: string;
}

export interface DebitCreditsInput {
  userId: string;
  delta: number; // negative
  reason: CreditReason;
  refId: string;
}
