import { NextResponse } from "next/server";
import {
  createAdminServices,
  createUserServices,
  getSessionUser,
} from "@/services/compose";
import { ChatService } from "@/services/chat-service";
import { InsufficientCreditsError } from "@/domain/credits/rules";
import type { AgentEvent } from "@/domain/agent/types";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chatId = new URL(request.url).searchParams.get("chatId");
  const { chatService } = await createUserServices();

  if (chatId) {
    const messages = await chatService.getMessages(chatId, user.id);
    return NextResponse.json({ messages });
  }

  const chats = await chatService.list(user.id);
  return NextResponse.json({ chats });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    chatId?: string;
    message?: string;
    create?: boolean;
    stream?: boolean;
  };

  const { chats, usage, settingsService } = await createUserServices();
  const settings = await settingsService.getPrivate(user.id);

  // Creating an empty chat does not require an API key
  if (body.create && !body.message) {
    if (!settings) {
      return NextResponse.json(
        { error: "Add your API key in Settings before chatting." },
        { status: 400 },
      );
    }
    const admin = createAdminServices();
    const chatService = new ChatService(chats, usage, admin.billing);
    const chat = await chatService.create(user.id, settings.modelKey);
    return NextResponse.json({ chat });
  }

  if (!settings?.apiKey) {
    return NextResponse.json(
      { error: "Add your API key in Settings before chatting." },
      { status: 400 },
    );
  }

  const admin = createAdminServices();
  const chatService = new ChatService(chats, usage, admin.billing);

  try {
    let chatId = body.chatId;
    if (!chatId) {
      const chat = await chatService.create(user.id, settings.modelKey);
      chatId = chat.id;
    }

    if (!body.message || !chatId) {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const wantStream = body.stream !== false;
    if (!wantStream) {
      const result = await chatService.runTurn({
        userId: user.id,
        chatId,
        message: body.message,
        settings,
      });
      const balance = await admin.billing.getBalance(user.id);
      return NextResponse.json({
        chatId,
        answer: result.answer,
        steps: result.steps,
        usage: result.usage,
        balance: balance.balance,
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        };

        send({ kind: "meta", chatId });

        try {
          const result = await chatService.runTurn({
            userId: user.id,
            chatId: chatId!,
            message: body.message!,
            settings,
            onEvent: (event: AgentEvent) => send(event),
          });
          const balance = await admin.billing.getBalance(user.id);
          send({
            kind: "meta",
            chatId,
            balance: balance.balance,
            steps: result.steps,
            usage: result.usage,
          });
        } catch (err) {
          if (err instanceof InsufficientCreditsError) {
            send({
              kind: "error",
              message: "Insufficient credits",
              balance: err.balance,
              status: 402,
            });
          } else {
            const message =
              err instanceof Error ? err.message : "Chat failed";
            send({ kind: "error", message });
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", balance: err.balance },
        { status: 402 },
      );
    }
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
