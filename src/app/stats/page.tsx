"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Summary = {
  chatId: string;
  title: string;
  modelKey: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  createdAt: string;
};

export default function StatsPage() {
  const [rows, setRows] = useState<Summary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Failed");
        setRows(data.chats ?? []);
      })
      .catch((e) => setError(e.message));
  }, []);

  const total = rows.reduce((s, r) => s + r.costUsd, 0);

  return (
    <main className="mesh min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/chat" className="text-sm text-muted hover:text-accent">
            ← Back to chat
          </Link>
          <span className="font-[family-name:var(--font-display)] text-accent">
            MicroManus
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Cost & stats
        </h1>
        <p className="mt-2 text-muted">
          Token usage and estimated USD by chat, using the pricing version stored
          with each event.
        </p>

        <p className="mt-6 text-sm text-muted">
          Total estimated:{" "}
          <span className="text-foreground">${total.toFixed(4)}</span>
        </p>

        {error ? <p className="mt-4 text-danger">{error}</p> : null}

        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Chat</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Input</th>
                <th className="px-4 py-3 font-medium">Output</th>
                <th className="px-4 py-3 font-medium">Cache</th>
                <th className="px-4 py-3 font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.chatId} className="border-t border-border">
                  <td className="px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3 text-muted">{r.modelKey ?? "—"}</td>
                  <td className="px-4 py-3">{r.inputTokens}</td>
                  <td className="px-4 py-3">{r.outputTokens}</td>
                  <td className="px-4 py-3">
                    {r.cacheReadTokens}
                    {r.cacheWriteTokens
                      ? ` / w${r.cacheWriteTokens}`
                      : ""}
                  </td>
                  <td className="px-4 py-3">${r.costUsd.toFixed(4)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No chats yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
