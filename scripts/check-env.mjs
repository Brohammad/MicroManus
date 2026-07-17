#!/usr/bin/env node
/**
 * Validates env vars for MicroManus.
 *
 *   node scripts/check-env.mjs --oauth    # public Supabase keys only (sign-in)
 *   node scripts/check-env.mjs --auth     # oauth + service role (paywall/ledger)
 *   node scripts/check-env.mjs            # full (deploy-ready)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const mode = process.argv.includes("--oauth")
  ? "oauth"
  : process.argv.includes("--auth")
    ? "auth"
    : "full";

/** Browser + middleware — never includes service role. */
const oauthRequired = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
];

/**
 * Paywall coupon / Stripe webhook / PDF upload use the service role
 * on the SERVER ONLY (createAdminClient). Never prefix with NEXT_PUBLIC_.
 */
const authRequired = [
  ...oauthRequired,
  "SUPABASE_SERVICE_ROLE_KEY",
  "COUPON_CODE",
];

const fullRequired = [
  ...authRequired,
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "BRAVE_SEARCH_API_KEY",
];

const optional = [
  "STRIPE_WEBHOOK_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    out[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return out;
}

const env = {
  ...loadEnvFile(resolve(process.cwd(), ".env")),
  ...loadEnvFile(resolve(process.cwd(), ".env.local")),
  ...process.env,
};

const required =
  mode === "oauth"
    ? oauthRequired
    : mode === "auth"
      ? authRequired
      : fullRequired;

let missing = 0;

console.log(`Mode: ${mode}`);
console.log("Required:");
for (const key of required) {
  const ok = Boolean(env[key] && String(env[key]).trim());
  console.log(`  ${ok ? "✓" : "✗"} ${key}`);
  if (!ok) missing += 1;
}
console.log("Optional / later:");
for (const key of optional) {
  const ok = Boolean(env[key] && String(env[key]).trim());
  console.log(`  ${ok ? "✓" : "·"} ${key}`);
}

if (mode === "oauth" && env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log(
    "\nNote: SUPABASE_SERVICE_ROLE_KEY is set (OK). Keep it server-only — never NEXT_PUBLIC_.",
  );
}

if (missing) {
  console.log(`\n${missing} required var(s) missing. See SETUP.md`);
  process.exit(1);
}

const messages = {
  oauth: "\nOAuth env OK — restart npm run dev, then verify Google/GitHub sign-in.",
  auth: "\nAuth+Paywall env OK — coupon/ledger can use service role on the server.",
  full: "\nAll required env vars present.",
};
console.log(messages[mode]);
