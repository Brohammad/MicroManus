# MicroManus — Architecture

Frozen design. Change only if acceptance tests force it.

## Layers

```text
Browser (UI)
    │
    ▼
app/api/*  (thin orchestration)
    │
    ▼
services/*  (use-cases)
    │
    ├── domain/*          pure TypeScript + ports
    └── infrastructure/*  adapters (Supabase, Stripe, Brave, LLM, PDF, Redis)
```

### Rules

- `domain/` must not import Next.js, React, Supabase, Stripe, or Vercel SDKs.
- Browser never sees `SUPABASE_SERVICE_ROLE_KEY`, raw API keys, or provider wire headers.
- Service role only via `createAdminClient()` inside server routes/services.
- Credits: `credit_transactions` ledger; balance = `SUM(delta)`.
- Agent: typed `AgentState` union; tools implement `ToolV1`; LLM via `LLMProvider`.
- Cache: Upstash for search/fetch only; prompt cache is provider-native.

## Auth & paywall flow

```text
OAuth (Google/GitHub)
  → Supabase callback
  → /auth/callback
  → /paywall (if balance ≤ 0)
  → coupon or Stripe
  → +5 ledger
  → /chat
```

## Agent loop

```text
START → PLAN → CALL_TOOL → OBSERVE → (MORE? → PLAN) → FINAL
```

## Docs map

| File | Purpose |
| --- | --- |
| [README.md](README.md) | Product overview + quick start |
| [ARCHITECTURE.md](ARCHITECTURE.md) | This file |
| [MILESTONES.md](MILESTONES.md) | Phase board + progress |
| [ACCEPTANCE.md](ACCEPTANCE.md) | Definition of done per phase |
| [CHANGELOG.md](CHANGELOG.md) | Versioned shipping notes |
| [SETUP.md](SETUP.md) | Infrastructure / env / OAuth |
| [db/schema.sql](db/schema.sql) | Database source of truth |
