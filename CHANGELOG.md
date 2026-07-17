# Changelog

All notable shipped milestones. **Do not tag a version until ACCEPTANCE.md for that phase is fully checked.**

Format: keep entries outcome-focused.

---

## Unreleased

### Infrastructure (verification only — not acceptance)

- Supabase project connected (`cajzhljmknpjudgrdjaw`)
- Schema migrated with RLS, indexes, trigger, balance RPC
- Private `artifacts` storage bucket
- Auth middleware lock redirects
- Security hardening for `get_credit_balance` / `handle_new_user`
- OAuth env check passes; providers still **manual**

### Blocked for `v0.1.0`

See [ACCEPTANCE.md](ACCEPTANCE.md) Phase 1 acceptance checklist.

---

## v0.1.0 — Authentication & Paywall

*Not tagged yet.*

Planned contents after acceptance:

- Google + GitHub OAuth
- Session persistence
- Paywall + `SID_DRDROID` (+5, once per user, 409 on reuse)
- Locked-route redirects

---

## v0.2.0 — Chat foundation

*Not tagged yet.*

---

## v0.3.0 — Multi-LLM settings

*Not tagged yet.*

---

## v0.4.0 — Research agent

*Not tagged yet.*

---

## v0.5.0 — PDF artifacts

*Not tagged yet.*

---

## v0.6.0 — Billing & analytics

*Not tagged yet.*

---

## v1.0.0 — Production submission

*Not tagged yet.*
