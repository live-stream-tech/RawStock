import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";
import { MEDIA_PLACEHOLDER_DATA_URI } from "@/lib/media-placeholder";

/** Resolve relative, protocol-relative, or site-root media paths. Empty / invalid uses inline SVG (no dead external links). */
export function resolvePublicMediaUri(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return MEDIA_PLACEHOLDER_DATA_URI;
  if (/^data:image\//i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
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
