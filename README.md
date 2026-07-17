# MicroManus

Deep research AI agent with social login, credit ledger paywall, BYOK OpenAI-compatible models, web tools, PDF artifacts, and per-chat cost stats.

See **[MILESTONES.md](MILESTONES.md)** for phase progress and **[SETUP.md](SETUP.md)** for infrastructure.

## Architecture (frozen)

```text
src/
  app/              # Next.js UI + thin API orchestration
  domain/           # Pure TS (no Supabase/Next/React) + repository ports
  services/         # Use-cases
  infrastructure/   # Supabase, Stripe, Brave, Redis, LLM, PDF adapters
```

Agent loop: typed state machine `START → PLAN → CALL_TOOL → OBSERVE → FINAL`.

**Service role:** only via `createAdminClient()` inside server API routes/services. Never `NEXT_PUBLIC_`.

## Setup

1. Copy env: `cp .env.example .env.local` and fill values (see SETUP.md Slice A then B).
2. Create a [Supabase](https://supabase.com) project.
3. For paywall: run [`db/schema.sql`](db/schema.sql); create private Storage bucket `artifacts`.
4. Enable **GitHub** and **Google** Auth; redirect URL `http://localhost:3000/auth/callback`.
5. Stripe / Brave / Upstash as needed for later phases.
6. Deploy to Vercel; set `NEXT_PUBLIC_APP_URL` to the production URL.

```bash
npm install
npm run check-env:oauth   # Slice A
npm run dev
```

## Product flow

1. Sign up with GitHub or Google.
2. Paywall: coupon `SID_DRDROID` **or** Stripe $5 → **+5 credits** (ledger).
3. Settings: choose provider (OpenRouter / OpenAI) + model + API key (no baked-in key).
4. Chat: agent uses `web_search` → `fetch_page` → optional `create_pdf_report`.
5. Stats: input / output / cache tokens + USD with `pricing_version`.

## Coupon

Default code: `SID_DRDROID` (override with `COUPON_CODE`). Second redeem → **409**.
