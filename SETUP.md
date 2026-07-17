# MicroManus — Infrastructure checklist

Do this in order. Paste values into `.env.local` (local) and Vercel project settings (prod).

## 1. Supabase (do first)

### Security

| Variable | Where it may live |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server (RLS-scoped) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** (`createAdminClient`). Never `NEXT_PUBLIC_`, never client components |

### Slice A — OAuth only (sign-in works)

1. Create a project at https://supabase.com
2. Authentication → Providers → enable **Google** and **GitHub**
3. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`
4. Project Settings → API — copy into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Set `NEXT_PUBLIC_APP_URL=http://localhost:3000`
6. Restart `npm run dev` → `npm run check-env:oauth` → verify Google/GitHub login

### Slice B — Paywall + ledger (after OAuth works)

1. SQL Editor → run entire [`db/schema.sql`](db/schema.sql)
2. Storage → New bucket → name `artifacts` → **private**
3. Add **server-only** `SUPABASE_SERVICE_ROLE_KEY` (needed for coupon/Stripe ledger writes that bypass RLS)
4. Set `COUPON_CODE=SID_DRDROID`
5. `npm run check-env:auth` → redeem coupon → balance **5**

### Google OAuth app

- Authorized redirect URI from Supabase provider docs (looks like `https://<PROJECT_REF>.supabase.co/auth/v1/callback`)
- Client ID + secret → paste into Supabase Google provider

### GitHub OAuth app

- Homepage: your app URL
- Authorization callback URL: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
- Client ID + secret → paste into Supabase GitHub provider

## 2. Stripe (test mode)

1. https://dashboard.stripe.com → Test mode ON
2. Developers → API keys:
   - `STRIPE_SECRET_KEY` (`sk_test_…`)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`)
3. After Vercel deploy, Developers → Webhooks → Add endpoint:
   - URL: `https://YOUR_APP.vercel.app/api/stripe/webhook`
   - Event: `checkout.session.completed`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`
4. Local testing (optional): `stripe listen --forward-to localhost:3000/api/stripe/webhook`

## 3. Brave Search

1. https://api-dashboard.search.brave.com
2. Subscribe / create API key → `BRAVE_SEARCH_API_KEY`

## 4. Upstash Redis (optional)

Skip to ship faster. Search/fetch cache is already best-effort and disabled when unset.

If adding later:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## 5. Vercel

```bash
# from repo root
npx vercel
```

Set env vars (same as `.env.example`), then:

```text
NEXT_PUBLIC_APP_URL=https://YOUR_APP.vercel.app
COUPON_CODE=SID_DRDROID
```

Redeploy after env changes. Update Supabase + OAuth redirect URLs to production.

## OAuth redirect URIs (easy to get wrong)

There are **two different callback layers**:

| Where | What to add |
|---|---|
| **Supabase** → Authentication → URL Configuration | Site URL: `https://YOUR_APP.vercel.app` (and localhost for dev). Redirect URLs: `http://localhost:3000/auth/callback` and `https://YOUR_APP.vercel.app/auth/callback` |
| **Google Cloud** OAuth client | Authorized redirect URI = Supabase’s callback only: `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |
| **GitHub** OAuth App | Authorization callback URL = same Supabase callback: `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |

Do **not** point Google/GitHub at your Vercel domain. They must redirect to Supabase; Supabase then redirects to your app’s `/auth/callback`.

## 6. Smoke test

1. Landing  
2. Google or GitHub sign-in  
3. Land on `/paywall`  
4. Redeem `SID_DRDROID`  
5. Balance = **5**  
6. Settings → add API key (OpenRouter recommended)  
7. New chat  
8. Prompt that forces web search  
9. Ask for a PDF report  
10. Open `/stats`  
11. See tokens + cost  
12. Confirm credits = **4**

When all twelve pass, polish UI and email the signup URL.
