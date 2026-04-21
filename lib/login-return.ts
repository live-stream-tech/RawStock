const RETURN_KEY = "line_login_return";

/** ログイン完了後に戻ってきたいURLを保存する（既に値があれば上書きしない） */
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

/** 保存されている戻り先URLを取得してクリアする */
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

const DEFAULT_AFTER_LOGIN = "/(tabs)/profile";

/** OAuth 完了後の `router.replace` 用。`getLoginReturn` と同じ除外ルールを `auth/callback` と共有する */
export function consumeLoginRedirectPath(): string {
  const saved = getLoginReturn();
  let returnTo = saved ?? DEFAULT_AFTER_LOGIN;
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

