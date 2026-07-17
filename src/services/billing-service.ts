import {
  grantUnlockCredits,
  isValidCoupon,
  debitChatTurn,
  InsufficientCreditsError,
  COUPON_CODE,
} from "@/domain/credits/rules";
import type { CreditRepository } from "@/domain/ports/credit-repository";
import {
  getStripe,
  STRIPE_UNLOCK_AMOUNT_CENTS,
} from "@/infrastructure/stripe/client";

export class BillingService {
  constructor(private readonly credits: CreditRepository) {}

  async getBalance(userId: string) {
    return this.credits.getBalance(userId);
  }

  async redeemCoupon(userId: string, code: string) {
    if (!isValidCoupon(code, process.env.COUPON_CODE ?? COUPON_CODE)) {
      throw new Error("Invalid coupon code");
    }

    const refId = `coupon:${userId}`;
    const existing = (await this.credits.listTransactions(userId)).find(
      (tx) => tx.reason === "coupon" && tx.refId === refId,
    );
    if (existing) {
      throw new CouponAlreadyRedeemedError();
    }

    return grantUnlockCredits(this.credits, {
      userId,
      reason: "coupon",
      refId,
    });
  }

  async createCheckoutSession(userId: string, email: string) {
    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: STRIPE_UNLOCK_AMOUNT_CENTS,
            product_data: {
              name: "MicroManus Credits",
              description: "Unlock MicroManus with 5 research credits",
            },
          },
        },
      ],
      metadata: { userId },
      success_url: `${appUrl}/paywall?success=1`,
      cancel_url: `${appUrl}/paywall?canceled=1`,
    });
    return session;
  }

  async handleStripeCheckoutCompleted(sessionId: string, userId: string) {
    return grantUnlockCredits(this.credits, {
      userId,
      reason: "stripe",
      refId: sessionId,
    });
  }

  async debitForChatTurn(userId: string, chatId: string) {
    try {
      return await debitChatTurn(this.credits, userId, chatId);
    } catch (err) {
      if (err instanceof InsufficientCreditsError) throw err;
      throw err;
    }
  }
}

export class CouponAlreadyRedeemedError extends Error {
  constructor() {
    super("Coupon already redeemed for this account");
    this.name = "CouponAlreadyRedeemedError";
  }
}
