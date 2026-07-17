"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PaywallPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"coupon" | "stripe" | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      router.replace("/chat");
    }
  }, [router]);

  async function redeemCoupon(e: React.FormEvent) {
    e.preventDefault();
    setLoading("coupon");
    setError(null);
    const res = await fetch("/api/credits/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setError(data.error ?? "Invalid coupon");
      return;
    }
    router.push("/chat");
  }

  async function payWithCard() {
    setLoading("stripe");
    setError(null);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    setLoading(null);
    if (!res.ok || !data.url) {
      setError(data.error ?? "Checkout unavailable");
      return;
    }
    window.location.href = data.url;
  }

  return (
    <main className="mesh min-h-screen px-6 py-16">
      <div className="mx-auto w-full max-w-lg">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-lg text-accent"
        >
          MicroManus
        </Link>
        <h1 className="mt-10 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Unlock research credits
        </h1>
        <p className="mt-3 text-muted">
          Add a card for $5, or enter a coupon. Either path grants{" "}
          <span className="text-foreground">5 credits</span>.
        </p>

        <div className="mt-10 space-y-6 rounded-xl border border-border bg-surface/80 p-6">
          <button
            type="button"
            onClick={payWithCard}
            disabled={loading !== null}
            className="w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-background disabled:opacity-60"
          >
            {loading === "stripe" ? "Redirecting…" : "Pay $5 with card"}
          </button>

          <div className="relative text-center text-xs uppercase tracking-widest text-muted">
            <span className="bg-surface px-2">or coupon</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
          </div>

          <form onSubmit={redeemCoupon} className="space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter coupon code"
              className="w-full rounded-md border border-border bg-background px-3 py-3 text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={loading !== null || !code.trim()}
              className="w-full rounded-md border border-border px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loading === "coupon" ? "Checking…" : "Redeem coupon"}
            </button>
          </form>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
      </div>
    </main>
  );
}
