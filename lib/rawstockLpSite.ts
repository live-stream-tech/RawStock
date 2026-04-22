/**
 * Canonical marketing LP lives in https://github.com/live-stream-tech/rawstock-lp
 * (Vite SPA: `/` = UK English, `/ja` = Japanese). This app embeds or redirects to that site.
 */
export const RAWSTOCK_LP_SITE_DEFAULT = "https://rawstock-lp.vercel.app";

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

export function rawstockLpRedirectUrl(acceptLanguage: string | undefined): string {
  const origin = rawstockLpSiteOrigin();
  if (!acceptLanguage) return `${origin}/`;
  const first = acceptLanguage.split(",")[0]?.trim().split(";")[0]?.toLowerCase() || "";
  if (first.startsWith("ja")) return `${origin}/ja`;
  return `${origin}/`;
}
