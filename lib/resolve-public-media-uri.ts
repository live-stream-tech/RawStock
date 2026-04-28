import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { MEDIA_PLACEHOLDER_DATA_URI } from "@/lib/media-placeholder";

/** Resolve relative, protocol-relative, or site-root media paths. Empty / invalid uses inline SVG (no dead external links). */
export function resolvePublicMediaUri(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return MEDIA_PLACEHOLDER_DATA_URI;
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) {
    const httpsUrl = s.replace(/^http:\/\//i, "https://");
    try {
      const u = new URL(httpsUrl);
      // If legacy data points to direct r2.dev URLs, route via same-origin proxy.
      if (/\.r2\.dev$/i.test(u.hostname)) {
        const key = decodeURIComponent(u.pathname.replace(/^\/+/, ""));
        if (key) {
          if (Platform.OS === "web" && typeof window !== "undefined") {
            return `${window.location.origin}/api/r2-public/${encodeURIComponent(key)}`;
          }
          const base = getApiUrl().replace(/\/+$/, "");
          return `${base}/api/r2-public/${encodeURIComponent(key)}`;
        }
      }
      // Repair old malformed upload URLs pointing to typo hosts.
      if (u.hostname !== "rawstock.live" && u.hostname.endsWith("rawstock.live")) {
        u.hostname = "rawstock.live";
      }
      return u.toString();
    } catch {
      return httpsUrl;
    }
  }
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return `${window.location.origin}${s}`;
    }
    const base = getApiUrl().replace(/\/+$/, "");
    return `${base}${s}`;
  }
  // Unknown/unsupported schemes (or malformed values) should never render as a blank image.
  return MEDIA_PLACEHOLDER_DATA_URI;
}
