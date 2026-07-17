import { NextResponse } from "next/server";
import { createAdminServices, getSessionUser } from "@/services/compose";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { billing } = createAdminServices();
  const balance = await billing.getBalance(user.id);
  return NextResponse.json({ balance: balance.balance });
}
