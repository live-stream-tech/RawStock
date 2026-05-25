#!/usr/bin/env node
/**
 * End-to-end production auth diagnostic.
 *
 * Usage:
 *   node scripts/check-auth-prod.mjs                    # public probes only
 *   node scripts/check-auth-prod.mjs --token=eyJ...     # also fetch admin client-errors
 *   AUTH_TOKEN=eyJ... node scripts/check-auth-prod.mjs  # same via env
 *
 * Get your token (in the browser DevTools Console on rawstock.live):
 *   copy(localStorage.getItem('auth_token'))
 */

const BASE = "https://rawstock.live";
const args = process.argv.slice(2);
const tokenArg = args.find((a) => a.startsWith("--token="))?.slice(8);
const TOKEN = tokenArg || process.env.AUTH_TOKEN || "";

const LINE = "─".repeat(60);
const PASS = "✓";
const FAIL = "✗";
const WARN = "!";

function pad(label, w = 28) {
  return label + " ".repeat(Math.max(0, w - label.length));
}

async function fetchSafe(url, opts = {}) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { redirect: "manual", ...opts });
    const ct = res.headers.get("content-type") ?? "";
    let body;
    if (ct.includes("application/json")) {
      body = await res.json().catch(() => null);
    } else {
      const txt = await res.text().catch(() => "");
      body = txt.length > 500 ? txt.slice(0, 500) + "…" : txt;
    }
    return { ok: true, status: res.status, headers: Object.fromEntries(res.headers), body, ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, error: e.message, ms: Date.now() - t0 };
  }
}

function judge(actual, expected, msg) {
  const pass = actual === expected;
  console.log(`  ${pass ? PASS : FAIL} ${pad(msg)} ${pad(String(actual), 6)} ${pass ? "" : `(expected ${expected})`}`);
  return pass;
}

console.log(LINE);
console.log("RawStock production auth diagnostic");
console.log("Target:", BASE);
console.log(LINE);

const fail = [];

console.log("\n[1] /api/auth/status — Google config & callback URL");
{
  const r = await fetchSafe(`${BASE}/api/auth/status`);
  if (!judge(r.status, 200, "HTTP status")) fail.push("auth/status not 200");
  const g = r.body?.google ?? {};
  const okConfig = judge(Boolean(g.configured), true, "google.configured");
  const okCallback = judge(g.callbackUrl, `${BASE}/api/auth/google-callback`, "google.callbackUrl");
  const okOrigin = judge(g.publicOrigin, BASE, "google.publicOrigin");
  console.log("  ·", pad("google.clientId", 28), (g.clientId ?? "").slice(0, 24) + "…");
  if (!okConfig || !okCallback || !okOrigin) fail.push("auth/status mismatch");
}

console.log("\n[2] /api/auth/google — redirect to Google");
{
  const r = await fetchSafe(`${BASE}/api/auth/google`);
  const isRedirect = r.status === 302 || r.status === 307;
  console.log(`  ${isRedirect ? PASS : FAIL} ${pad("HTTP status")} ${r.status} ${isRedirect ? "" : "(expected 302/307)"}`);
  const loc = r.headers?.location ?? "";
  const okGoogle = loc.startsWith("https://accounts.google.com/o/oauth2/v2/auth");
  console.log(`  ${okGoogle ? PASS : FAIL} ${pad("Location → Google")}`);
  if (okGoogle) {
    const u = new URL(loc);
    const cb = u.searchParams.get("redirect_uri") ?? "";
    const okCb = cb === `${BASE}/api/auth/google-callback`;
    console.log(`  ${okCb ? PASS : FAIL} ${pad("redirect_uri")} ${cb || "(empty)"}`);
    if (!okCb) fail.push("redirect_uri mismatch — check GCP authorized URIs");
  } else {
    fail.push("google redirect missing");
  }
}

console.log("\n[3] /api/auth/me — without token");
{
  const r = await fetchSafe(`${BASE}/api/auth/me`);
  if (!judge(r.status, 401, "HTTP status")) fail.push("auth/me unauth not 401");
}

console.log("\n[4] /api/auth/me — with garbage token (should also 401)");
{
  const r = await fetchSafe(`${BASE}/api/auth/me`, {
    headers: { Authorization: "Bearer not-a-real-jwt" },
  });
  if (!judge(r.status, 401, "HTTP status")) fail.push("auth/me bad-token not 401");
}

if (TOKEN) {
  console.log("\n[5] /api/auth/me — with YOUR token");
  const r = await fetchSafe(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const ok = r.status === 200;
  console.log(`  ${ok ? PASS : FAIL} ${pad("HTTP status")} ${r.status}`);
  if (ok) {
    const u = r.body ?? {};
    console.log("  ·", pad("user.id", 28), u.id);
    console.log("  ·", pad("user.email", 28), u.email ?? "(none)");
    console.log("  ·", pad("user.role", 28), u.role ?? "USER");
    console.log("  ·", pad("user.displayName", 28), u.displayName ?? "");
  } else {
    fail.push("your token is invalid — log in again at /auth/login");
  }

  console.log("\n[6] /api/admin/client-errors — recent errors (needs ADMIN)");
  const errs = await fetchSafe(`${BASE}/api/admin/client-errors?limit=10`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (errs.status === 200 && Array.isArray(errs.body)) {
    console.log(`  ${PASS} ${pad("HTTP status")} 200 (${errs.body.length} rows)`);
    if (errs.body.length === 0) {
      console.log("  · no unresolved client errors. clean.");
    } else {
      for (const row of errs.body.slice(0, 10)) {
        const stage = (() => {
          try {
            return JSON.parse(row.payloadJson ?? "{}")?.stage ?? "";
          } catch {
            return "";
          }
        })();
        console.log(`  · ${row.createdAt}  [${row.kind}] ${row.status ?? "-"} ${(row.title ?? "").slice(0, 36)}`);
        console.log(`      ${(row.message ?? "").slice(0, 110)}`);
        if (stage) console.log(`      stage=${stage}`);
      }
    }
  } else if (errs.status === 403) {
    console.log(`  ${WARN} 403 Forbidden — your account is not ADMIN.`);
  } else {
    console.log(`  ${FAIL} HTTP ${errs.status}`);
    fail.push(`admin client-errors HTTP ${errs.status}`);
  }
} else {
  console.log("\n[5-6] Skipped (no token).  Pass --token=eyJ... to fetch /me and admin errors.");
}

console.log("\n" + LINE);
if (fail.length === 0) {
  console.log(`${PASS} All public probes passed.${TOKEN ? " Your auth state is healthy." : ""}`);
} else {
  console.log(`${FAIL} ${fail.length} issue(s):`);
  for (const f of fail) console.log("  · " + f);
}
console.log(LINE);
