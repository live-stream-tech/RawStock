/**
 * Parses enhanced thread body directives.
 * - FLYER_IMAGE: https://...
 * - SHORT_VIDEO: https://...
 * Directive lines are removed from display text.
 */

export type ParsedThreadBody = {
  flyerImageUrl: string | null;
  shortVideoUrl: string | null;
  text: string;
};

const directImageRe = /(https?:\/\/\S+\.(?:png|jpe?g|webp|gif)(?:\?\S*)?)/i;

function extractUrlFromLine(trimmed: string): string | null {
  const m = trimmed.match(/https?:\/\/\S+/i);
  return m ? m[0] : null;
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
  let shortVideoUrl: string | null = null;
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!flyerImageUrl && /^FLYER_IMAGE\s*:/i.test(trimmed)) {
      flyerImageUrl = extractUrlFromLine(trimmed);
      continue;
    }
    if (!shortVideoUrl && /^SHORT_VIDEO\s*:/i.test(trimmed)) {
      shortVideoUrl = extractUrlFromLine(trimmed);
      continue;
    }
    if (!flyerImageUrl) {
      const m = trimmed.match(directImageRe);
      if (m?.[1]) flyerImageUrl = m[1];
    }
    kept.push(line);
  }
  return { flyerImageUrl, shortVideoUrl, text: kept.join("\n").trim() };
}
