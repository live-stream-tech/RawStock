import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { MEDIA_PLACEHOLDER_DATA_URI } from "@/lib/media-placeholder";
import { getClientR2PublicBaseUrl, rewriteMediaUrlToR2Direct } from "@/lib/r2-public-url";

/** Resolve relative, protocol-relative, or site-root media paths. Empty / invalid uses inline SVG (no dead external links). */
export function resolvePublicMediaUri(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return MEDIA_PLACEHOLDER_DATA_URI;
  if (/^data:image\//i.test(s)) return s;

  const r2Base = getClientR2PublicBaseUrl();

  if (/^https?:\/\//i.test(s)) {
    let httpsUrl = s.replace(/^http:\/\//i, "https://");
    httpsUrl = rewriteMediaUrlToR2Direct(httpsUrl, r2Base);
    try {
      const u = new URL(httpsUrl);
      if (u.hostname !== "rawstock.live" && u.hostname.endsWith("rawstock.live")) {
        u.hostname = "rawstock.live";
      }
      return u.toString();
    } catch {
      return httpsUrl;
    }
  }

  if (s.startsWith("//")) {
    return rewriteMediaUrlToR2Direct(`https:${s}`, r2Base);
  }

  if (s.startsWith("/")) {
    const proxyPath = s.match(/^\/api\/r2-public\/(.+)$/i);
    if (proxyPath?.[1] && r2Base) {
      return rewriteMediaUrlToR2Direct(s, r2Base);
    }
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return `${window.location.origin}${s}`;
    }
    const base = getApiUrl().replace(/\/+$/, "");
    return `${base}${s}`;
  }

  return MEDIA_PLACEHOLDER_DATA_URI;
}
