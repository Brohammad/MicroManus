import type { CreditRepository } from "../ports/credit-repository";
import type { DebitCreditsInput, GrantCreditsInput } from "./types";

export const UNLOCK_CREDITS = 5;
export const CHAT_TURN_COST = 1;
export const COUPON_CODE = "SID_DRDROID";

export function assertNonZeroDelta(delta: number): void {
  if (delta === 0) {
    throw new Error("Credit delta must be non-zero");
  }
}

export async function grantUnlockCredits(
  repo: CreditRepository,
  input: Omit<GrantCreditsInput, "delta"> & { delta?: number },
) {
  const delta = input.delta ?? UNLOCK_CREDITS;
  assertNonZeroDelta(delta);
  if (delta < 0) throw new Error("Grant delta must be positive");
  const tx = await repo.grant({ ...input, delta });
  await repo.markUnlocked(input.userId);
  return tx;
}

export async function debitChatTurn(
  repo: CreditRepository,
  userId: string,
  chatId: string,
) {
  const balance = await repo.getBalance(userId);
  if (balance.balance < CHAT_TURN_COST) {
    throw new InsufficientCreditsError(balance.balance);
  }
  const input: DebitCreditsInput = {
    userId,
    delta: -CHAT_TURN_COST,
    reason: "chat",
    refId: `chat-turn:${chatId}:${crypto.randomUUID()}`,
  };
  return repo.debit(input);
}

export class InsufficientCreditsError extends Error {
  constructor(public readonly balance: number) {
    super(`Insufficient credits: ${balance}`);
    this.name = "InsufficientCreditsError";
  }
}

export function isValidCoupon(code: string, expected = COUPON_CODE): boolean {
  return code.trim().toUpperCase() === expected.toUpperCase();
}
