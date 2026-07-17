import { NextResponse } from "next/server";
import { createUserServices, getSessionUser } from "@/services/compose";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { usage } = await createUserServices();
  const summaries = await usage.summarizeByUser(user.id);
  return NextResponse.json({ chats: summaries });
}
