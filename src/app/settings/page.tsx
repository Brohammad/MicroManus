"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Model = { key: string; label: string };
type Provider = { id: "openrouter" | "openai"; label: string };

export default function SettingsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [provider, setProvider] = useState<"openrouter" | "openai">("openrouter");
  const [modelKey, setModelKey] = useState("claude-sonnet-4-6");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.providers ?? []);
        setModels(data.models ?? []);
        if (data.settings) {
          setProvider(data.settings.provider);
          setModelKey(data.settings.modelKey);
          setHasKey(data.settings.hasApiKey);
          setShowAdvanced(Boolean(data.settings.baseUrlConfigured));
        }
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        modelKey,
        apiKey: apiKey || undefined,
        baseUrl: showAdvanced ? baseUrl || null : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }
    setHasKey(Boolean(data.settings?.hasApiKey));
    setApiKey("");
    setStatus("Saved. Your key stays on the server.");
  }

  return (
    <main className="mesh min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/chat" className="text-sm text-muted hover:text-accent">
            ← Back to chat
          </Link>
          <span className="font-[family-name:var(--font-display)] text-accent">
            MicroManus
          </span>
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Model settings
        </h1>
        <p className="mt-2 text-muted">
          Bring your own OpenAI-compatible key. Endpoints are resolved on the
          server — the UI never talks to providers directly.
        </p>

        <form
          onSubmit={save}
          className="mt-8 space-y-5 rounded-xl border border-border bg-surface/80 p-6"
        >
          <label className="block space-y-2 text-sm">
            <span className="text-muted">Provider</span>
            <select
              value={provider}
              onChange={(e) =>
                setProvider(e.target.value as "openrouter" | "openai")
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">Model</span>
            <select
              value={modelKey}
              onChange={(e) => setModelKey(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            >
              {models.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="text-muted">
              API key {hasKey ? "(saved — leave blank to keep)" : ""}
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasKey ? "••••••••••••" : "sk-…"}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs text-muted underline"
          >
            {showAdvanced ? "Hide advanced" : "Advanced: custom base URL"}
          </button>

          {showAdvanced ? (
            <label className="block space-y-2 text-sm">
              <span className="text-muted">OpenAI-compatible base URL</span>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
          ) : null}

          <button
            type="submit"
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-background"
          >
            Save settings
          </button>

          {status ? <p className="text-sm text-accent">{status}</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
