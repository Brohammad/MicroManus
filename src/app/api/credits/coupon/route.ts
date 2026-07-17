import { NextResponse } from "next/server";
import { createAdminServices, getSessionUser } from "@/services/compose";
import { CouponAlreadyRedeemedError } from "@/services/billing-service";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { code?: string };
  if (!body.code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  try {
    const { billing } = createAdminServices();
    await billing.redeemCoupon(user.id, body.code);
    const balance = await billing.getBalance(user.id);
    return NextResponse.json({ ok: true, balance: balance.balance });
  } catch (err) {
    if (err instanceof CouponAlreadyRedeemedError) {
      return NextResponse.json(
        { error: err.message, alreadyRedeemed: true },
        { status: 409 },
      );
    }
    const message = err instanceof Error ? err.message : "Coupon failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
