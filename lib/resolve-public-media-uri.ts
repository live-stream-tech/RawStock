import { Platform } from "react-native";

const FALLBACK_THUMB =
  "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=520&fit=crop";

/** Resolve relative protocol-relative, or site-root paths for thumbnails and flyers. */
export function resolvePublicMediaUri(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return FALLBACK_THUMB;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (Platform.OS === "web" && typeof window !== "undefined" && s.startsWith("/")) {
    return `${window.location.origin}${s}`;
  }
  return s || FALLBACK_THUMB;
}
