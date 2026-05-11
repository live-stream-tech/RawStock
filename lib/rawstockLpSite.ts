/**
 * Production defaults to same origin ({@link RAWSTOCK_LP_SITE_DEFAULT}). LP is served at {@link RAWSTOCK_LP_PUBLIC_PATH}; override via env for another host.
 */
export const RAWSTOCK_LP_SITE_DEFAULT = "https://rawstock.live";

/** Canonical path for the standalone LP served by the main app (`/lp`). */
export const RAWSTOCK_LP_PUBLIC_PATH = "/lp";

/** English marketing LP when embedded under the same origin (Vite bundle at `/lp/`). */
export const RAWSTOCK_LP_EN_PUBLIC_PATH = "/lp/EN";

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

/** Server: prefer PUBLIC_RAWSTOCK_LP_URL, then EXPO_PUBLIC_* if bundled with server. */
export function rawstockLpSiteOrigin(): string {
  const fromEnv =
    (typeof process !== "undefined" && process.env.PUBLIC_RAWSTOCK_LP_URL?.trim()) ||
    (typeof process !== "undefined" && process.env.EXPO_PUBLIC_RAWSTOCK_LP_URL?.trim());
  if (fromEnv) return trimTrailingSlash(fromEnv);
  return trimTrailingSlash(RAWSTOCK_LP_SITE_DEFAULT);
}

/** Default LP URL for in-app iframe redirects, etc. */
export function rawstockLpRedirectUrl(acceptLanguage?: string | undefined): string {
  const fromEnv =
    (typeof process !== "undefined" && process.env.PUBLIC_RAWSTOCK_LP_URL?.trim()) ||
    (typeof process !== "undefined" && process.env.EXPO_PUBLIC_RAWSTOCK_LP_URL?.trim());
  if (fromEnv) {
    const base = trimTrailingSlash(fromEnv);
    const first = (acceptLanguage ?? "").split(",")[0]?.trim().split(";")[0]?.toLowerCase() || "";
    if (first.startsWith("ja")) return `${base}/ja`;
    return `${base}/`;
  }
  return RAWSTOCK_LP_PUBLIC_PATH;
}
