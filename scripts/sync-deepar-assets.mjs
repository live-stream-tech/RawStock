/**
 * Copies DeepAR Web runtime assets from node_modules/deepar into public/deepar
 * so the SDK can load wasm/models/effects from the same origin (see rootPath).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "node_modules", "deepar");
const dest = path.join(root, "public", "deepar");

if (!fs.existsSync(src)) {
  console.warn("[sync-deepar-assets] node_modules/deepar not found, skip");
} else {
const copyPaths = [
  "wasm",
  "effects",
  "models",
  "mediaPipe",
  "js/dynamicModules",
  "default_envmap.webp",
  "split_sum.webp",
  "VERSION.txt",
];

fs.mkdirSync(dest, { recursive: true });
for (const rel of copyPaths) {
  const from = path.join(src, rel);
  const to = path.join(dest, rel);
  if (!fs.existsSync(from)) {
    console.warn("[sync-deepar-assets] missing:", rel);
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  const st = fs.statSync(from);
  if (st.isDirectory()) {
    fs.cpSync(from, to, { recursive: true });
  } else {
    fs.copyFileSync(from, to);
  }
}
console.log("[sync-deepar-assets] synced to public/deepar");
}

// Incomplete nested hermes-parser breaks Babel (missing dist/utils/createSyntaxError.js); hoist to root copy.
const nestedHermes = path.join(
  root,
  "node_modules",
  "@react-native",
  "babel-preset",
  "node_modules",
  "hermes-parser",
);
const nestedCreateSyntaxError = path.join(nestedHermes, "dist", "utils", "createSyntaxError.js");
if (fs.existsSync(nestedHermes) && !fs.existsSync(nestedCreateSyntaxError)) {
  fs.rmSync(nestedHermes, { recursive: true, force: true });
  console.log("[sync-deepar-assets] removed broken nested hermes-parser (use hoisted package)");
}
