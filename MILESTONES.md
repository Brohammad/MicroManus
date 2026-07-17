# MicroManus — Milestones

Progress tracker. Architecture is frozen; only revisit a completed phase if an E2E test finds a defect.

```text
✅ Phase 0 - Architecture
🟢 Phase 1 - Authentication (Slice A) — blocked on your Supabase public keys
🟡 Phase 2 - Paywall (Slice B)
⚪ Phase 3 - Chat foundation (Slice C)
⚪ Phase 4 - Multi-LLM settings
⚪ Phase 5 - Research agent (state machine + tools)
⚪ Phase 6 - PDF artifacts
⚪ Phase 7 - Billing & analytics (Stripe + stats)
⚪ Phase 8 - Caching (Upstash search/fetch)
⚪ Phase 9 - Polish & deployment
```

---

## Phase 0 — Architecture ✅

Layering: `app` → `services` → `domain` (ports) ← `infrastructure`.

- Thin API routes / no business logic in the browser
- `credit_transactions` ledger (`SUM(delta)`)
- Typed `AgentState` union, `ToolV1`, `LLMProvider`
- Opaque settings API
- Redis = search/fetch only; prompt cache = provider-native

---

## Phase 1 — Authentication (Slice A) 🟢

**Env (public only):**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**No `SUPABASE_SERVICE_ROLE_KEY` required.**

Acceptance:

- [ ] Google OAuth
- [ ] GitHub OAuth
- [ ] Session persists across refresh
- [ ] Profile row created (`handle_new_user` trigger after schema — or soft-create on first paywall)

Check: `npm run check-env:oauth` → restart `npm run dev`

---

## Phase 2 — Paywall (Slice B) 🟡

**Env (server):**

```env
SUPABASE_SERVICE_ROLE_KEY=   # SERVER ONLY — never NEXT_PUBLIC_
COUPON_CODE=SID_DRDROID
# Stripe keys when wiring card unlock
```

**Service role usage rule:** only inside server API routes / services via `createAdminClient()`. Browser never imports it.

Flow:

```text
Browser → POST /api/credits/coupon
       → authenticate session
       → validate coupon
       → reject if already redeemed (409)
       → admin grant (+5 ledger) + mark unlocked
       → return balance
```

Acceptance: frozen Auth+Paywall criteria (coupon once, balance 5, lock redirects).

Check: `npm run check-env:auth`

---

## Phase 3 — Chat foundation (Slice C) ⚪

Before deepening the research agent, verify chat plumbing alone:

- [ ] Create chat
- [ ] List chats
- [ ] Persist user/assistant messages
- [ ] Load conversation history
- [ ] Streaming transport (SSE) — can mock LLM text first

Then swap the mock for the real agent (Phase 5).

---

## Phase 4 — Multi-LLM settings ⚪

- Provider + model + API key (opaque)
- Advanced optional `base_url`
- Keys never returned to the client in full

---

## Phase 5 — Research agent ⚪

- State machine: START → PLAN → CALL_TOOL → OBSERVE → FINAL
- Tools: Brave search → fetch → (PDF in Phase 6)
- Credit debit −1 per user turn

---

## Phase 6 — PDF artifacts ⚪

- `create_pdf_report` tool → Storage `artifacts` bucket

---

## Phase 7 — Billing & analytics ⚪

- Stripe Checkout $5 + webhook
- Usage events + `/stats` (tokens + `pricing_version` + cost)

---

## Phase 8 — Caching ⚪

- Upstash for search/fetch only (optional)

---

## Phase 9 — Polish & deployment ⚪

- Vercel URL, OAuth production redirects, 12-step smoke test, email signup URL

---

## Env layout (canonical)

```env
# Public (browser)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Server
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BRAVE_SEARCH_API_KEY=
COUPON_CODE=SID_DRDROID

# Optional server cache
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

`BRAVE_SEARCH_API_KEY` is the name used in code (same role as a generic `BRAVE_API_KEY`).
