/**
 * Patches vendored rawstock-lp for embedding under https://rawstock.live/lp/
 * Usage: node scripts/patch-rawstock-lp-for-embed.mjs <repo-root>  (e.g. vendor/rawstock-lp)
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "");
if (!root || !fs.existsSync(path.join(root, "vite.config.ts"))) {
  console.error("Usage: node scripts/patch-rawstock-lp-for-embed.mjs <rawstock-lp-root>");
  process.exit(1);
}

function patchVite() {
  const p = path.join(root, "vite.config.ts");
  let s = fs.readFileSync(p, "utf8");
  if (s.includes('base: "/lp/"')) return;
  s = s.replace(
    "export default defineConfig({",
    'export default defineConfig({\n  base: "/lp/",',
  );
  fs.writeFileSync(p, s);
}

function patchApp() {
  const p = path.join(root, "client", "src", "App.tsx");
  let s = fs.readFileSync(p, "utf8");
  if (s.includes("RAWSTOCK_LIVE_EMBEDDED_LP")) return;
  s = s.replace(
    "function App() {\n  return (",
    `function App() {
  if (import.meta.env.BASE_URL === "/lp/") {
    return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <HomeJP />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
    );
  }
  return (`,
  );
  fs.writeFileSync(p, s);
}

patchVite();
patchApp();
