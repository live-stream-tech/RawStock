/** App upload object keys (must match `server/r2.ts` `isAppUploadR2Key`). */
export function isAppUploadR2Key(key: string): boolean {
  return /^rawstock_\d+_[a-zA-Z0-9_.-]+$/.test(key);
}

export function normalizeR2PublicBase(base: string): string {
  return base.trim().replace(/\/+$/, "");
}

export function buildR2PublicObjectUrl(publicBase: string, key: string): string {
  return `${normalizeR2PublicBase(publicBase)}/${key}`;
}

/** Extract object key from `/api/r2-public/...` or a direct public R2 URL path. */
export function extractAppUploadR2KeyFromUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const u = new URL(s.startsWith("//") ? `https:${s}` : s);
    const proxy = u.pathname.match(/\/api\/r2-public\/(.+)$/i);
    if (proxy?.[1]) {
      const key = decodeURIComponent(proxy[1]);
      return isAppUploadR2Key(key) ? key : null;
    }
    const key = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
    return isAppUploadR2Key(key) ? key : null;
  } catch {
    return null;
  }
}

/**
 * Rewrite legacy same-origin proxy URLs to direct R2 public URLs when `publicBase` is set.
 * Returns the input unchanged when no rewrite applies.
 */
export function rewriteMediaUrlToR2Direct(raw: unknown, publicBase: string | null | undefined): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s || !publicBase?.trim()) return s;
  const base = normalizeR2PublicBase(publicBase);
  if (s.startsWith(`${base}/`)) return s;
  const key = extractAppUploadR2KeyFromUrl(s);
  if (key) return buildR2PublicObjectUrl(base, key);
  return s;
}

/** Client build-time public base (set same value as server `R2_PUBLIC_BASE_URL` on Vercel). */
export function getClientR2PublicBaseUrl(): string | null {
  const baked = process.env.EXPO_PUBLIC_R2_PUBLIC_BASE_URL?.trim();
  return baked ? normalizeR2PublicBase(baked) : null;
}
