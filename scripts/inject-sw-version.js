/**
 * ビルド後に dist/sw.js の __CACHE_VERSION__ を置換する。
 * デプロイごとにキャッシュ名が変わり、activate で古いキャッシュが削除される。
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const publicSw = path.join(root, "public", "sw.js");
const distSw = path.join(root, "dist", "sw.js");

const version =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  `t${Date.now()}`;

let content;
try {
  content = fs.readFileSync(publicSw, "utf8");
} catch (e) {
  console.error("inject-sw-version: public/sw.js not found");
  process.exit(1);
}

const replaced = content.replace(/__CACHE_VERSION__/g, version);

if (!fs.existsSync(path.dirname(distSw))) {
  console.warn("inject-sw-version: dist/ not found, skipping (run after expo export)");
  process.exit(0);
}

fs.writeFileSync(distSw, replaced, "utf8");
console.log("inject-sw-version: dist/sw.js written with cache version", version.slice(0, 8));
