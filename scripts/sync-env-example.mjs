#!/usr/bin/env node
/**
 * Merge selected non-secret keys from `.env` into `.env.example`.
 * Does NOT touch DATABASE_URL, tokens, secrets, or keys not in MERGE_KEYS.
 *
 * Usage: npm run env:sync-example
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

/** ローカル .env から .env.example に写してよいキー（数字・ポート・手数料定数など） */
const MERGE_KEYS = new Set([
  "PORT",
  "EXPO_PORT",
  "WITHDRAWAL_FEE_BPS",
  "WITHDRAWAL_FEE_FIXED_USD_CENTS",
  "WITHDRAWAL_MIN_NET_TRANSFER_USD_CENTS",
]);

function parseEnvFile(text) {
  const map = new Map();
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

function main() {
  if (!fs.existsSync(envPath)) {
    console.warn("[sync-env-example] No .env file found; nothing to merge.");
    process.exit(0);
  }

  const fromEnv = parseEnvFile(fs.readFileSync(envPath, "utf8"));
  let example = fs.readFileSync(examplePath, "utf8");
  const lines = example.split(/\r?\n/);
  let changed = 0;

  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) return line;
    const key = trimmed.slice(0, eq).trim();
    if (!MERGE_KEYS.has(key)) return line;
    if (!fromEnv.has(key)) return line;
    const val = fromEnv.get(key);
    const oldVal = trimmed.slice(eq + 1).trim();
    if (oldVal === val) return line;
    const prefix = line.slice(0, line.indexOf(trimmed));
    changed += 1;
    return `${prefix}${key}=${val}`;
  });

  if (changed === 0) {
    const hasAny = [...MERGE_KEYS].some((k) => fromEnv.has(k));
    console.log(
      hasAny
        ? "[sync-env-example] No edits written (values already match .env, or those keys are only in # comments in .env.example)."
        : "[sync-env-example] No merge keys present in .env.",
    );
    process.exit(0);
  }

  fs.writeFileSync(examplePath, out.join("\n"), "utf8");
  console.log(`[sync-env-example] Updated ${changed} line(s) in .env.example from .env (keys: ${[...MERGE_KEYS].filter((k) => fromEnv.has(k)).join(", ")})`);
}

main();
