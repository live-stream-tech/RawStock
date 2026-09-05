#!/usr/bin/env node
/**
 * List unresolved production client errors.
 *
 * Prefer local DATABASE_URL (no deploy / no admin JWT needed):
 *   npm run check:client-errors
 *   npm run check:client-errors -- --limit=50
 *
 * Or via API after CLIENT_ERRORS_READ_SECRET is set on Vercel:
 *   CLIENT_ERRORS_READ_SECRET=... npm run check:client-errors -- --via=api
 *   CLIENT_ERRORS_READ_SECRET=... npm run check:client-errors -- --via=api --limit=50
 *
 * Admin JWT still works for the UI at /admin/client-errors.
 */
import "dotenv/config";
import pg from "pg";

const BASE = (process.env.APP_URL || "https://rawstock.live").replace(/\/$/, "");
const args = process.argv.slice(2);
const viaApi = args.includes("--via=api") || args.includes("--via") && args[args.indexOf("--via") + 1] === "api";
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = Math.min(
  Math.max(parseInt(limitArg?.slice(8) || "30", 10) || 30, 1),
  500,
);

function trunc(s, n = 140) {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

async function viaDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Use --via=api with CLIENT_ERRORS_READ_SECRET, or set DATABASE_URL.");
    process.exit(1);
  }
  const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const exists = await c.query(`SELECT to_regclass('public.client_error_events') AS t`);
    if (!exists.rows[0]?.t) {
      console.log("client_error_events table does not exist yet.");
      return;
    }
    const total = await c.query(
      `SELECT count(*)::int AS c FROM client_error_events WHERE resolved_at IS NULL`,
    );
    const q = await c.query(
      `
      SELECT id, kind, severity, status, title, message, route, code, platform, created_at
      FROM client_error_events
      WHERE resolved_at IS NULL
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit],
    );
    console.log(`Unresolved client errors: ${total.rows[0].c} (showing ${q.rows.length})`);
    console.log("─".repeat(72));
    for (const r of q.rows) {
      const when = r.created_at ? new Date(r.created_at).toISOString() : "-";
      console.log(
        `#${r.id} ${when}  [${r.kind}/${r.severity}]  HTTP ${r.status ?? "-"}  ${r.route ?? "-"}`,
      );
      console.log(`  ${trunc(r.title || r.message)}`);
      if (r.title && r.message && r.title !== r.message) {
        console.log(`  ${trunc(r.message)}`);
      }
      if (r.code) console.log(`  code=${r.code}`);
    }
  } finally {
    await c.end();
  }
}

async function viaHttpApi() {
  const secret = (process.env.CLIENT_ERRORS_READ_SECRET || "").trim();
  const token = (process.env.AUTH_TOKEN || args.find((a) => a.startsWith("--token="))?.slice(8) || "").trim();
  if (!secret && !token) {
    console.error(
      "Need CLIENT_ERRORS_READ_SECRET or AUTH_TOKEN / --token=... for --via=api",
    );
    process.exit(1);
  }
  const headers = {};
  if (secret) {
    headers["X-Client-Errors-Read-Secret"] = secret;
    headers.Authorization = `Bearer ${secret}`;
  } else {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/api/admin/client-errors?limit=${limit}`, { headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`HTTP ${res.status}`, body);
    process.exit(1);
  }
  const rows = Array.isArray(body) ? body : [];
  console.log(`Unresolved client errors via API: ${rows.length} (limit ${limit})`);
  console.log("─".repeat(72));
  for (const r of rows) {
    const when = r.createdAt ? new Date(r.createdAt).toISOString() : "-";
    console.log(
      `#${r.id} ${when}  [${r.kind}/${r.severity}]  HTTP ${r.status ?? "-"}  ${r.route ?? "-"}`,
    );
    console.log(`  ${trunc(r.title || r.message)}`);
    if (r.title && r.message && r.title !== r.message) {
      console.log(`  ${trunc(r.message)}`);
    }
  }
}

if (viaApi) {
  await viaHttpApi();
} else {
  await viaDatabase();
}
