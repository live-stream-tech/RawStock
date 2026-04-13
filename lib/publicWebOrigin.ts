import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

/** getApiUrl 内のローカル判定と同じ（チケット戻り先のスキーム用） */
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
 * ブラウザ上で見えているアプリのオリジン（Stripe success_url 等）。
 * API ベース（getApiUrl）とは別。EXPO_PUBLIC_DOMAIN が http://localhost:8081 のときは https に昇格しない。
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
