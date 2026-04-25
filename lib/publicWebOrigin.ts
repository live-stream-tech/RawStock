import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

/** Same localhost heuristics as inside `getApiUrl` (Stripe return URL scheme) */
function isLikelyLocalHostname(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith("localhost") ||
    h.startsWith("127.0.0.1") ||
    /^192\.168\.\d+\.\d+/.test(h) ||
    /^10\.\d+\.\d+\.\d+/.test(h)
  );
}

/**
 * Public web origin visible in the browser (Stripe success_url, etc.).
 * Not the API base from `getApiUrl`. Does not force https when EXPO_PUBLIC_DOMAIN is http://localhost:8081.
 */
export function getPublicWebOrigin(): string {
  const raw = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (raw) {
    let normalized: string;
    if (/^https?:\/\//i.test(raw)) {
      normalized = raw;
    } else {
      const h = raw.replace(/^\/\//, "");
      normalized = isLikelyLocalHostname(h) ? `http://${h}` : `https://${h}`;
    }
    return new URL(normalized).origin;
  }

  if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return new URL("/", getApiUrl()).origin;
}
