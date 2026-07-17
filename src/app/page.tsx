"use client";

import { useState } from "react";
import { createClient } from "@/infrastructure/supabase/client";

export default function HomePage() {
  const [configError, setConfigError] = useState<string | null>(null);

  async function signIn(provider: "github" | "google") {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setConfigError(
        "Supabase is not configured yet. Fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
      );
      return;
    }
    const supabase = createClient();
    const origin = window.location.origin;
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback?next=/paywall`,
      },
    });
  }

  return (
    <main className="mesh relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(232,236,233,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(232,236,233,0.4)_1px,transparent_1px)] [background-size:48px_48px]" />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <p className="font-[family-name:var(--font-display)] text-xl tracking-tight text-accent">
          MicroManus
        </p>
        <p className="text-sm text-muted">Deep research agent</p>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[75vh] w-full max-w-5xl flex-col justify-center px-6 pb-24">
        <h1 className="max-w-3xl font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
          MicroManus
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
          Research the web in a think → act → observe loop. Unlock five credits,
          connect your own model key, and ship PDF reports.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => signIn("github")}
            className="rounded-md bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-dim"
          >
            Continue with GitHub
          </button>
          <button
            type="button"
            onClick={() => signIn("google")}
            className="rounded-md border border-border bg-surface px-5 py-3 text-sm font-semibold text-foreground transition hover:border-accent"
          >
            Continue with Google
          </button>
        </div>

        {configError ? (
          <p className="mt-6 max-w-xl rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {configError}
          </p>
        ) : null}
      </section>
    </main>
  );
}
