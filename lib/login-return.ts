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

