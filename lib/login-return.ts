const RETURN_KEY = "line_login_return";

/** Persist post-login return URL (does not overwrite if a value already exists). */
export function saveLoginReturn(path: string | null | undefined) {
  if (typeof window === "undefined") return;
  if (!path) return;
  if (path.startsWith("/auth/login")) return;
  try {
    const existing = localStorage.getItem(RETURN_KEY);
    if (existing) return;
    if (path.startsWith("/") && !path.startsWith("//")) {
      localStorage.setItem(RETURN_KEY, path);
    }
  } catch {
    // ignore
  }
}

/** Read and clear the saved return URL. */
export function getLoginReturn(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(RETURN_KEY);
    if (saved && saved.startsWith("/") && !saved.startsWith("//")) {
      localStorage.removeItem(RETURN_KEY);
      return saved;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Public path (not `/(tabs)/…`) so static export and deep links stay valid. */
const DEFAULT_AFTER_LOGIN = "/profile";

/** Map legacy `/(tabs)/…` paths saved in localStorage to public URLs. */
function normalizeLegacyTabPath(path: string): string {
  if (path === "/(tabs)") return "/";
  if (path.startsWith("/(tabs)/")) return `/${path.slice("/(tabs)/".length)}`;
  return path;
}

/** For `router.replace` after OAuth; shares the same exclusion rules as `getLoginReturn` with `auth/callback`. */
export function consumeLoginRedirectPath(): string {
  const saved = getLoginReturn();
  let returnTo = normalizeLegacyTabPath(saved ?? DEFAULT_AFTER_LOGIN);
  const isInvalidReturn =
    returnTo.startsWith("/auth/") ||
    returnTo.startsWith("/jukebox") ||
    returnTo.startsWith("/lp") ||
    returnTo.startsWith("/teamz") ||
    returnTo.startsWith("/rawstock-lp") ||
    returnTo.startsWith("/terms") ||
    returnTo.startsWith("/privacy") ||
    returnTo.startsWith("/dmca") ||
    returnTo.startsWith("/community-guidelines") ||
    returnTo === "/legal" ||
    returnTo.startsWith("/legal?") ||
    returnTo.startsWith("/legal-notice") ||
    returnTo.startsWith("/tokusho");
  if (isInvalidReturn) returnTo = DEFAULT_AFTER_LOGIN;
  return returnTo;
}

