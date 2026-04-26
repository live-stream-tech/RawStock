/**
 * Parses enhanced thread body directives.
 * - FLYER_IMAGE: https://...  /  legacy Japanese line `フライヤー画像:` (still parsed for old threads)
 * - SHORT_VIDEO: https://...
 * Directive lines are removed from display text.
 *
 * Flyer URL is taken **only** from explicit directives — not from random image URLs in the body
 * (avoids profile / avatar images being treated as the event flyer).
 */

export type ParsedThreadBody = {
  flyerImageUrl: string | null;
  shortVideoUrl: string | null;
  text: string;
};

/**
 * R2 S3 API endpoints (…r2.cloudflarestorage.com) are not anonymously readable in the browser.
 * URLs under a dedicated public domain (R2_PUBLIC_BASE_URL) are fine.
 */
export function isNonPublicObjectStorageFlyerUrl(url: string | null | undefined): boolean {
  const s = typeof url === "string" ? url.trim() : "";
  if (!s) return false;
  try {
    const host = new URL(s).hostname.toLowerCase();
    return host.endsWith(".r2.cloudflarestorage.com");
  } catch {
    return false;
  }
}

function pickDisplayFlyerUrl(primary: string | null, original: string | null): string | null {
  const p = primary?.trim() || null;
  const o = original?.trim() || null;
  if (p && !isNonPublicObjectStorageFlyerUrl(p)) return p;
  if (o && !isNonPublicObjectStorageFlyerUrl(o)) return o;
  return p || o;
}

function extractUrlFromLine(trimmed: string): string | null {
  const md = trimmed.match(/\((https?:\/\/[^)\s]+)\)/i);
  if (md?.[1]) return md[1].replace(/[)\],。．、]+$/g, "");
  const m = trimmed.match(/https?:\/\/\S+/i);
  if (!m?.[0]) return null;
  let u = m[0];
  const nextHttp = u.slice(8).search(/https?:\/\//i);
  if (nextHttp >= 0) {
    u = u.slice(0, nextHttp + 8);
  }
  return u.replace(/[)\],。．、"'<>\u3000]+$/g, "");
}

/** Returns a YouTube thumbnail URL if the video ID can be extracted. */
export function youtubeThumbnailFromVideoUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
    }
    if (host.endsWith("youtube.com") || host === "www.youtube.com" || host === "m.youtube.com") {
      const v = u.searchParams.get("v");
      if (v) return `https://img.youtube.com/vi/${v}/mqdefault.jpg`;
      const shorts = u.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (shorts?.[1]) return `https://img.youtube.com/vi/${shorts[1]}/mqdefault.jpg`;
      const embed = u.pathname.match(/^\/embed\/([^/?#]+)/);
      if (embed?.[1]) return `https://img.youtube.com/vi/${embed[1]}/mqdefault.jpg`;
    }
  } catch {
    return null;
  }
  return null;
}

export function parseThreadBody(raw: string | null | undefined): ParsedThreadBody {
  const body = String(raw ?? "");
  if (!body.trim()) return { flyerImageUrl: null, shortVideoUrl: null, text: "" };
  const lines = body.split("\n");

  let flyerImageUrl: string | null = null;
  /** Backup when `FLYER_IMAGE` points at a non-public object-storage URL (e.g. R2 S3 API host). */
  let flyerImageOriginalUrl: string | null = null;
  let shortVideoUrl: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^FLYER_IMAGE_ORIGINAL\s*[:：]/i.test(trimmed)) {
      const u = extractUrlFromLine(trimmed);
      if (u) flyerImageOriginalUrl = u;
      continue;
    }
    if (/^FLYER_IMAGE\s*[:：]/i.test(trimmed) || /^フライヤー画像(?:URL)?\s*[:：]/i.test(trimmed)) {
      const u = extractUrlFromLine(trimmed);
      if (u) flyerImageUrl = u;
      continue;
    }
    if (/^SHORT_VIDEO\s*[:：]/i.test(trimmed)) {
      const u = extractUrlFromLine(trimmed);
      if (u) shortVideoUrl = u;
    }
  }

  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^FLYER_IMAGE_ORIGINAL\s*[:：]/i.test(trimmed)) {
      continue;
    }
    if (/^FLYER_IMAGE\s*[:：]/i.test(trimmed) || /^フライヤー画像(?:URL)?\s*[:：]/i.test(trimmed)) {
      continue;
    }
    if (/^SHORT_VIDEO\s*[:：]/i.test(trimmed)) {
      continue;
    }
    kept.push(line);
  }

  const flyer = pickDisplayFlyerUrl(flyerImageUrl, flyerImageOriginalUrl);

  return { flyerImageUrl: flyer, shortVideoUrl, text: kept.join("\n").trim() };
}
