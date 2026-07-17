import { NextResponse } from "next/server";
import { createAdminServices, getSessionUser } from "@/services/compose";

export async function POST() {
  const user = await getSessionUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { billing } = createAdminServices();
    const session = await billing.createCheckoutSession(user.id, user.email);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
