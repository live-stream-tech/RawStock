#!/usr/bin/env node
/**
 * Apply R2 bucket CORS via Cloudflare API (browser direct PUT / multipart uploads).
 *
 * Requires:
 *   CLOUDFLARE_ACCOUNT_ID
 *   R2_BUCKET_NAME
 *   CLOUDFLARE_API_TOKEN (or CLOUDFLARE_R2_CORS_TOKEN) with R2 bucket write / Admin Read & Write
 *
 * Optional: FRONTEND_URL, EXPO_PUBLIC_DOMAIN — merged into allowed origins.
 *
 * Usage:
 *   npm run r2:apply-cors
 *   npm run r2:apply-cors -- --dry-run
 *   node scripts/apply-r2-cors.mjs --file config/r2-cors.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadDotEnv(path.join(root, ".env"));

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fileIdx = args.indexOf("--file");
const corsFile =
  fileIdx >= 0 && args[fileIdx + 1]
    ? path.resolve(root, args[fileIdx + 1])
    : path.join(root, "config", "r2-cors.json");

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
const bucket = process.env.R2_BUCKET_NAME?.trim();
const token =
  process.env.CLOUDFLARE_R2_CORS_TOKEN?.trim() || process.env.CLOUDFLARE_API_TOKEN?.trim();

function originFromUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  try {
    return new URL(s.includes("://") ? s : `https://${s}`).origin;
  } catch {
    return null;
  }
}

function mergeOrigins(baseOrigins) {
  const set = new Set(baseOrigins);
  for (const key of ["FRONTEND_URL", "EXPO_PUBLIC_DOMAIN"]) {
    const o = originFromUrl(process.env[key]);
    if (o) set.add(o);
  }
  return [...set].sort();
}

function loadPolicy() {
  if (!fs.existsSync(corsFile)) {
    console.error(`CORS file not found: ${corsFile}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(corsFile, "utf8"));
  if (!raw?.rules?.length) {
    console.error("CORS file must contain a non-empty rules array (Cloudflare API shape).");
    process.exit(1);
  }
  const policy = structuredClone(raw);
  for (const rule of policy.rules) {
    if (!rule.allowed?.origins?.length) {
      console.error("Each rule must have allowed.origins.");
      process.exit(1);
    }
    rule.allowed.origins = mergeOrigins(rule.allowed.origins);
  }
  return policy;
}

async function main() {
  if (!accountId || !bucket) {
    console.error("Set CLOUDFLARE_ACCOUNT_ID and R2_BUCKET_NAME in .env");
    process.exit(1);
  }
  if (!token) {
    console.error(
      "Set CLOUDFLARE_API_TOKEN or CLOUDFLARE_R2_CORS_TOKEN with Account → R2 → Edit (Stream-only tokens cannot set bucket CORS).",
    );
    process.exit(1);
  }

  const policy = loadPolicy();
  const origins = policy.rules.flatMap((r) => r.allowed.origins);
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/cors`;

  console.log(`Bucket: ${bucket}`);
  console.log(`Origins: ${origins.join(", ")}`);
  console.log(`Methods: ${[...new Set(policy.rules.flatMap((r) => r.allowed.methods ?? []))].join(", ")}`);

  if (dryRun) {
    console.log("\n--dry-run: would PUT", url);
    console.log(JSON.stringify(policy, null, 2));
    return;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(policy),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    const err = body.errors?.[0];
    console.error("Cloudflare API error:", err?.message ?? res.statusText, err?.code ? `(${err.code})` : "");
    if (err?.code === 10000 || res.status === 403) {
      console.error(
        "Token likely lacks R2 bucket CORS permission. Create an API token with Account → R2 → Edit.",
      );
    }
    process.exit(1);
  }

  console.log("R2 CORS policy applied. Wait ~1 minute before testing browser uploads.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
