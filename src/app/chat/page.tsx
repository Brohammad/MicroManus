"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ChatRow = {
  id: string;
  title: string;
};

type Message = {
  id: string;
  role: string;
  content: string;
};

type Step = {
  id: string;
  label: string;
};

export default function ChatPage() {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [streaming, setStreaming] = useState("");

  async function refreshChats() {
    const res = await fetch("/api/chat");
    const data = await res.json();
    setChats(data.chats ?? []);
  }

  async function refreshBalance() {
    const res = await fetch("/api/credits/balance");
    const data = await res.json();
    if (res.ok) setBalance(data.balance);
  }

  useEffect(() => {
    refreshChats();
    refreshBalance();
  }, []);

  async function selectChat(id: string) {
    setChatId(id);
    setError(null);
    setSteps([]);
    setStreaming("");
    const res = await fetch(`/api/chat?chatId=${id}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  async function newChat() {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ create: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not create chat");
      return;
    }
    await refreshChats();
    setChatId(data.chat.id);
    setMessages([]);
    setSteps([]);
    setStreaming("");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true);
    setError(null);
    setSteps([]);
    setStreaming("");
    const userText = input.trim();
    setInput("");
    setMessages((m) => [
      ...m,
      { id: `local-${Date.now()}`, role: "user", content: userText },
    ]);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, message: userText, stream: true }),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      setError(data.error ?? "Request failed");
      if (res.status === 402) window.location.href = "/paywall";
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let answer = "";
    let activeChatId = chatId;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part
          .split("\n")
          .find((l) => l.startsWith("data: "));
        if (!line) continue;
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(line.slice(6)) as Record<string, unknown>;
        } catch {
          continue;
        }

        if (event.kind === "meta" && typeof event.chatId === "string") {
          activeChatId = event.chatId;
          setChatId(event.chatId);
          if (typeof event.balance === "number") setBalance(event.balance);
        }

        if (event.kind === "tool_start") {
          const tool = event.tool as { id?: string; name?: string };
          setSteps((s) => [
            ...s,
            {
              id: tool.id ?? String(s.length),
              label: `Calling ${tool.name ?? "tool"}…`,
            },
          ]);
        }

        if (event.kind === "tool_end") {
          const obs = event.observation as {
            toolCallId?: string;
            name?: string;
            ok?: boolean;
          };
          setSteps((s) =>
            s.map((step) =>
              step.id === obs.toolCallId
                ? {
                    ...step,
                    label: `${obs.name ?? "tool"} ${obs.ok ? "ok" : "failed"}`,
                  }
                : step,
            ),
          );
        }

        if (event.kind === "state") {
          const state = event.state as { type?: string };
          if (state.type === "PLAN") {
            setSteps((s) => [
              ...s,
              { id: `plan-${s.length}`, label: "Planning next step…" },
            ]);
          }
        }

        if (event.kind === "token" && typeof event.text === "string") {
          answer += event.text;
          setStreaming(answer);
        }

        if (event.kind === "done" && typeof event.answer === "string") {
          answer = event.answer;
          setStreaming(event.answer);
        }

        if (event.kind === "error") {
          setError(String(event.message ?? "Chat failed"));
          if (event.status === 402) window.location.href = "/paywall";
        }
      }
    }

    if (answer) {
      setMessages((m) => [
        ...m,
        { id: `asst-${Date.now()}`, role: "assistant", content: answer },
      ]);
    }
    setStreaming("");
    setBusy(false);
    if (activeChatId) setChatId(activeChatId);
    refreshChats();
    refreshBalance();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 flex-col border-r border-border bg-surface/60">
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <span className="font-[family-name:var(--font-display)] text-accent">
            MicroManus
          </span>
          <button
            type="button"
            onClick={newChat}
            className="text-xs text-muted hover:text-accent"
          >
            New
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => selectChat(c.id)}
              className={`mb-1 w-full rounded-md px-3 py-2 text-left text-sm ${
                chatId === c.id
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:bg-background"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
        <div className="space-y-2 border-t border-border p-4 text-sm">
          <p className="text-muted">
            Credits:{" "}
            <span className="text-foreground">{balance ?? "—"}</span>
          </p>
          <Link href="/settings" className="block text-accent hover:underline">
            Settings
          </Link>
          <Link href="/stats" className="block text-accent hover:underline">
            Cost & stats
          </Link>
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-8">
          {messages.length === 0 && !busy ? (
            <div className="mx-auto max-w-2xl pt-24 text-center">
              <h1 className="font-[family-name:var(--font-display)] text-3xl">
                Start a research thread
              </h1>
              <p className="mt-3 text-muted">
                Ask a deep question. The agent will search, read sources, and can
                produce a PDF report.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`mx-auto max-w-3xl rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-accent/10 text-foreground"
                    : "border border-border bg-surface text-foreground"
                }`}
              >
                <p className="mb-1 text-[10px] uppercase tracking-wider text-muted">
                  {m.role}
                </p>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))
          )}

          {busy || steps.length > 0 ? (
            <div className="mx-auto max-w-3xl space-y-2 rounded-lg border border-border bg-surface/50 px-4 py-3 text-sm">
              <p className="text-[10px] uppercase tracking-wider text-muted">
                Agent loop
              </p>
              {steps.map((s) => (
                <p key={s.id} className="text-muted">
                  → {s.label}
                </p>
              ))}
              {streaming ? (
                <div className="whitespace-pre-wrap text-foreground">
                  {streaming}
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="mx-auto max-w-3xl text-sm text-danger">{error}</p>
          ) : null}
        </div>

        <form
          onSubmit={send}
          className="border-t border-border bg-surface/40 px-6 py-4"
        >
          <div className="mx-auto flex max-w-3xl gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Research prompt…"
              className="flex-1 rounded-md border border-border bg-background px-3 py-3 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-md bg-accent px-4 py-3 text-sm font-semibold text-background disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
