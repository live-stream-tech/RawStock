import {
  buildR2PublicObjectUrl,
  extractAppUploadR2KeyFromUrl,
  isAppUploadR2Key,
  normalizeR2PublicBase,
  rewriteMediaUrlToR2Direct,
} from "../../lib/r2-public-url";

export { isAppUploadR2Key, buildR2PublicObjectUrl, extractAppUploadR2KeyFromUrl };

/** Cloudflare R2 public bucket / custom domain base (no trailing slash). */
export function getR2PublicBaseUrl(): string | null {
  const raw = process.env.R2_PUBLIC_BASE_URL?.trim();
  return raw ? normalizeR2PublicBase(raw) : null;
}

export function rewriteStoredMediaUrl(url: string | null | undefined): string | null {
  if (url == null) return null;
  const out = rewriteMediaUrlToR2Direct(url, getR2PublicBaseUrl());
  return out || null;
}

export function mapVideoMediaFieldsForApi<T extends Record<string, unknown>>(row: T): T {
  const thumbnail = row.thumbnail;
  const videoUrl = row.videoUrl;
  const avatar = row.avatar;
  return {
    ...row,
    ...(typeof thumbnail === "string"
      ? { thumbnail: rewriteStoredMediaUrl(thumbnail) ?? thumbnail }
      : {}),
    ...(typeof videoUrl === "string" ? { videoUrl: rewriteStoredMediaUrl(videoUrl) ?? videoUrl } : {}),
    ...(typeof avatar === "string" ? { avatar: rewriteStoredMediaUrl(avatar) ?? avatar } : {}),
  };
}
