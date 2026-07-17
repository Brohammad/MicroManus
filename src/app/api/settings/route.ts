import { NextResponse } from "next/server";
import {
  createUserServices,
  getSessionUser,
} from "@/services/compose";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { settingsService } = await createUserServices();
  const settings = await settingsService.getPublic(user.id);
  return NextResponse.json({
    settings,
    models: settingsService.listModels(),
    providers: settingsService.listProviders(),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    provider?: "openrouter" | "openai";
    modelKey?: string;
    apiKey?: string;
    baseUrl?: string | null;
  };

  if (!body.provider || !body.modelKey) {
    return NextResponse.json(
      { error: "provider and modelKey are required" },
      { status: 400 },
    );
  }

  try {
    const { settingsService } = await createUserServices();
    const settings = await settingsService.upsert(user.id, {
      provider: body.provider,
      modelKey: body.modelKey,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
    });
    return NextResponse.json({ settings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
