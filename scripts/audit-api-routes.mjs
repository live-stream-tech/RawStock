/**
 * server/routes.ts の app.(get|post|put|patch|delete) を列挙し、
 * クライアント系ディレクトリ内にパス断片が現れるかで「参照あり／要確認」を付ける。
 * 動的セグメント (:id 等) は除去したプレフィックスでも検索する。
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ROUTES_FILE = path.join(ROOT, "server", "routes.ts");

const SCAN_DIRS = ["app", "lib", "components", "vite-app", "api", "scripts"];
const IGNORE_DIR_NAMES = new Set(["node_modules", ".git", "dist", "build", "server_dist", "ios", "android"]);

const ROUTE_RE = /app\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g;

function collectFiles(dir, out = []) {
  let st;
  try {
    st = fs.statSync(dir);
  } catch {
    return out;
  }
  if (!st.isDirectory()) return out;
  if (IGNORE_DIR_NAMES.has(path.basename(dir))) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (IGNORE_DIR_NAMES.has(name)) continue;
    const s = fs.statSync(p);
    if (s.isDirectory()) collectFiles(p, out);
    else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) out.push(p);
  }
  return out;
}

/** 動的セグメントを削りながら得られる固定プレフィックス候補（長い順） */
function pathNeedles(expressPath) {
  const parts = expressPath.split("/").filter(Boolean);
  const needles = new Set();
  needles.add(expressPath);
  while (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (last.startsWith(":")) {
      parts.pop();
      if (parts.length) needles.add("/" + parts.join("/"));
      continue;
    }
    break;
  }
  // 先頭 /api 以降で2セグメント目まで（例: /api/mentor）
  if (parts.length >= 2 && parts[0] === "api") {
    needles.add("/" + parts.slice(0, 2).join("/"));
    if (parts.length >= 3) needles.add("/" + parts.slice(0, 3).join("/"));
  }
  return [...needles].sort((a, b) => b.length - a.length);
}

function main() {
  const src = fs.readFileSync(ROUTES_FILE, "utf8");
  const routes = [];
  let m;
  while ((m = ROUTE_RE.exec(src)) !== null) {
    routes.push({ method: m[1].toUpperCase(), path: m[2], line: src.slice(0, m.index).split("\n").length });
  }

  const files = SCAN_DIRS.flatMap((d) => collectFiles(path.join(ROOT, d)));
  const contents = new Map();
  for (const f of files) {
    try {
      contents.set(f, fs.readFileSync(f, "utf8"));
    } catch {
      /* skip */
    }
  }

  const haystack = [...contents.values()].join("\n");

  const rows = routes.map((r) => {
    const needles = pathNeedles(r.path);
    const hitExact = haystack.includes(r.path);
    const hitNeedle = needles.some((n) => n.length >= 6 && haystack.includes(n));
    let status = "参照なし（要確認）";
    if (hitExact) status = "参照あり（パス文字列一致）";
    else if (hitNeedle) status = "参照あり（プレフィックス／部分一致・動的URLの可能性）";
    return { ...r, status, needles: needles.slice(0, 3).join(" | ") };
  });

  const md = [];
  md.push("# API ルート突合表（自動生成）");
  md.push("");
  md.push("生成: `node scripts/audit-api-routes.mjs`");
  md.push("");
  md.push("## 凡例");
  md.push("");
  md.push("- **参照あり（パス文字列一致）**: クライアント側ソースにルート文字列そのものが含まれる。");
  md.push("- **参照あり（プレフィックス／部分一致）**: `:id` 等を除いた断片がヒット。テンプレートリテラル分割や queryKey でもヒットしうる。**同一プレフィックスの別API**（例: `/api/banner/checkout-session` のコードが `/api/banner/checkout` を参照あり扱いにする）による**誤判定**があり得ます。");
  md.push("- **参照なし（要確認）**: 上記いずれも不可。**外部Cron・別リポジトリ・手動curl・Stripeリダイレクト**などで使われている可能性あり。安易な削除禁止。");
  md.push("");
  md.push("## スキャン対象ディレクトリ");
  md.push("");
  md.push(SCAN_DIRS.map((d) => `- \`${d}/\``).join("\n"));
  md.push("");
  md.push("## サマリ");
  md.push("");
  const c1 = rows.filter((r) => r.status.startsWith("参照あり（パス")).length;
  const c2 = rows.filter((r) => r.status.includes("プレフィックス")).length;
  const c3 = rows.filter((r) => r.status.includes("要確認")).length;
  md.push(`| 分類 | 件数 |`);
  md.push(`|------|------|`);
  md.push(`| パス文字列一致 | ${c1} |`);
  md.push(`| プレフィックス／部分一致 | ${c2} |`);
  md.push(`| 参照なし（要確認） | ${c3} |`);
  md.push(`| **合計** | **${rows.length}** |`);
  md.push("");
  md.push("## 参照なし（要確認）一覧 — デッドAPI候補");
  md.push("");
  const suspects = rows.filter((r) => r.status.includes("要確認"));
  md.push(`件数: **${suspects.length}**`);
  md.push("");
  md.push("| Method | Path | routes.ts 付近 | 検索に使った断片 |");
  md.push("|--------|------|----------------|------------------|");
  for (const r of suspects) {
    md.push(`| ${r.method} | \`${r.path}\` | L${r.line} | ${r.needles.replace(/\|/g, "\\|")} |`);
  }
  md.push("");
  md.push("## 全ルート一覧");
  md.push("");
  md.push("| Method | Path | 突合結果 | routes.ts |");
  md.push("|--------|------|----------|-----------|");
  for (const r of rows) {
    const st = r.status.replace(/\|/g, "\\|");
    md.push(`| ${r.method} | \`${r.path}\` | ${st} | L${r.line} |`);
  }
  md.push("");

  const outPath = path.join(ROOT, "docs", "api-route-audit.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md.join("\n"), "utf8");
  console.log(`Wrote ${outPath} (${rows.length} routes, ${suspects.length} need manual review)`);
}

main();
