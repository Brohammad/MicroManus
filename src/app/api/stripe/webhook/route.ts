import { NextResponse } from "next/server";
import { getStripe } from "@/infrastructure/stripe/client";
import { createAdminServices } from "@/services/compose";

export async function POST(request: Request) {
  const stripe = getStripe();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Misconfigured webhook" }, { status: 500 });
  }

  const body = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    if (userId && session.id) {
      const { billing } = createAdminServices();
      await billing.handleStripeCheckoutCompleted(session.id, userId);
    }
  }

  return NextResponse.json({ received: true });
}
