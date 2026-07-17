# MicroManus — Acceptance Criteria

**Done means acceptance-complete**, not code-complete.

| Status | Meaning |
| --- | --- |
| Implementation | Code written |
| Verification | Tested locally / against infrastructure |
| **Acceptance** | End-to-end flow works exactly as the assignment requires |

Only acceptance unlocks a version tag (`v0.1.0`, etc.).

---

## Phase 1 — Authentication & Paywall

**Tag when green:** `v0.1.0`

### Infrastructure (verification)

- [x] Supabase project connected and healthy
- [x] Schema migrated (tables, indexes, RLS, policies, trigger, functions)
- [x] Private `artifacts` storage bucket
- [x] Auth middleware redirects unauthenticated users
- [x] Security advisors addressed (functions hardened)
- [x] `check-env:oauth` passes with public keys

### Acceptance (must all pass before tag)

- [ ] User can sign in with Google
- [ ] User can sign in with GitHub
- [ ] Session survives page refresh
- [ ] Unauthenticated user is redirected away from protected routes
- [ ] New authenticated user lands on `/paywall`
- [ ] Coupon `SID_DRDROID` grants exactly **5** credits (`+5` ledger row)
- [ ] Duplicate coupon redemption returns **409** and does not double-credit
- [ ] Credits persist after logout / login
- [ ] Locked users (balance ≤ 0) redirected to `/paywall` from `/chat`, `/settings`, `/stats`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured (server-only) so ledger grants work

### Manual blockers (cannot be done via MCP)

1. Enable Google OAuth in Supabase + Google Cloud client  
   Callback: `https://cajzhljmknpjudgrdjaw.supabase.co/auth/v1/callback`
2. Enable GitHub OAuth in Supabase + GitHub OAuth App (same callback)
3. Site URL + redirect: `http://localhost:3000` / `http://localhost:3000/auth/callback`
4. Paste `SUPABASE_SERVICE_ROLE_KEY` into `.env.local` (never `NEXT_PUBLIC_`)

---

## Phase 2 — Chat foundation

**Tag when green:** `v0.2.0`

- [ ] Create new chat
- [ ] List chats in sidebar
- [ ] Persist user and assistant messages
- [ ] Reload preserves conversation history
- [ ] Multiple chats are isolated per user
- [ ] Streaming transport works (SSE; mock LLM acceptable for this phase)

---

## Phase 3 — Settings & Multi-LLM

**Tag when green:** `v0.3.0`

- [ ] User can save provider + model + API key
- [ ] Key is never returned in full to the browser
- [ ] Chat refuses to run without a configured key
- [ ] Selected model is used for cost attribution

---

## Phase 4 — Research agent

**Tag when green:** `v0.4.0`

- [ ] Agent runs think → tool → observe → answer loop
- [ ] Brave search tool returns real results
- [ ] Fetch tool extracts readable page content
- [ ] Thread context retained within the same chat
- [ ] One credit deducted per user turn

---

## Phase 5 — PDF artifacts

**Tag when green:** `v0.5.0`

- [ ] Agent can create a PDF report artifact
- [ ] PDF is stored in private `artifacts` bucket
- [ ] User can download / open the artifact from the UI

---

## Phase 6 — Billing & analytics

**Tag when green:** `v0.6.0`

- [ ] Stripe Checkout $5 unlock grants **5** credits (idempotent webhook)
- [ ] `/stats` shows per-chat input / output / cache tokens
- [ ] Cost uses model pricing + `pricing_version`
- [ ] After multiple chats, costs are visible and attributable

---

## Phase 7 — Deploy & submit

**Tag when green:** `v1.0.0`

- [ ] Public Vercel URL (not localhost)
- [ ] Production OAuth redirects configured
- [ ] Full 12-step smoke test passes on production
- [ ] Signup URL ready to email to Siddarth
