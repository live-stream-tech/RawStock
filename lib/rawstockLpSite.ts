/**
 * 本番の既定は同一ドメイン（{@link RAWSTOCK_LP_SITE_DEFAULT}）。LP は {@link RAWSTOCK_LP_PUBLIC_PATH} で配信し、別ホストの LP にしたいときだけ環境変数で上書き。
 */
export const RAWSTOCK_LP_SITE_DEFAULT = "https://rawstock.live";

/** メインアプリが配信するスタンドアロン LP の正面パス（`/lp` を固定） */
export const RAWSTOCK_LP_PUBLIC_PATH = "/lp";

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

/** LP の既定URL。アプリ内 iframe 等で使用。 */
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
