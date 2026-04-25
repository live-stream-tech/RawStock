import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_DEV_API_PORT = "5001";
const DEV_API_FALLBACK = `http://127.0.0.1:${DEFAULT_DEV_API_PORT}/`;

function isLikelyLocalHostname(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h.startsWith("localhost") ||
    h.startsWith("127.0.0.1") ||
    /^192\.168\.\d+\.\d+/.test(h) ||
    /^10\.\d+\.\d+\.\d+/.test(h)
  );
}

/** Metro web dev server runs API on another port — do not treat window.origin as the API */
function isMetroBundlerOrigin(url: URL): boolean {
  const h = url.hostname.toLowerCase();
  if (h !== "localhost" && h !== "127.0.0.1") return false;
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const n = Number(port);
  if (n === 8081 || n === 8082) return true;
  if (n >= 19000 && n <= 19100) return true;
  return false;
}

/** For EXPO_PUBLIC_API_URL: normalize an explicit API base to `origin/` */
function normalizeExplicitApiBase(input: string): string {
  const t = input.trim().replace(/\/+$/, "");
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) {
    return new URL(t).origin + "/";
  }
  const hostPart = t.replace(/^\/\//, "");
  const proto = isLikelyLocalHostname(hostPart) ? "http" : "https";
  return new URL(`${proto}://${hostPart}`).origin + "/";
}

/** Resolve EXPO_PUBLIC_DOMAIN to API origin; swap Metro URLs to the dev API base */
function resolveFromExpoPublicDomain(): { url: string; source: string } | null {
  const raw = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (!raw) return null;

  let normalized: string;
  if (/^https?:\/\//i.test(raw)) {
    normalized = raw;
  } else {
    const h = raw.replace(/^\/\//, "");
    normalized = isLikelyLocalHostname(h) ? `http://${h}` : `https://${h}`;
  }

  const resolved = new URL(normalized).origin + "/";
  if (isMetroBundlerOrigin(new URL(resolved))) {
    console.warn(
      `[getApiUrl] EXPO_PUBLIC_DOMAIN is a Metro/Expo URL (${raw}); using API base ${DEV_API_FALLBACK}. Set EXPO_PUBLIC_API_URL if your API runs on another port.`,
    );
    return { url: DEV_API_FALLBACK, source: "env-metro-override" };
  }
  return { url: resolved, source: "env" };
}

function resolveFromWindow(): { url: string; source: string } | null {
  if (typeof window === "undefined" || !window.location?.origin) return null;
  const originUrl = new URL(window.location.origin);
  if (isMetroBundlerOrigin(originUrl)) {
    console.warn(
      `[getApiUrl] Web is on the Metro/Expo dev server (${window.location.origin}); using API ${DEV_API_FALLBACK}. Set EXPO_PUBLIC_API_URL if the API is elsewhere.`,
    );
    return { url: DEV_API_FALLBACK, source: "metro-fallback" };
  }
  return { url: window.location.origin + "/", source: "window" };
}

/**
 * Express API base URL (trailing slash).
 *
 * Prefer `window.location` on deployed web (non-Metro).
 * If baked EXPO_PUBLIC_DOMAIN drifts from production, previews/custom URLs may hit the wrong host (502s).
 * When the API is on another domain, always set EXPO_PUBLIC_API_URL.
 */
export function getApiUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (explicit) {
    return normalizeExplicitApiBase(explicit);
  }

  const fromWindow = resolveFromWindow();
  if (fromWindow?.source === "window") {
    return fromWindow.url;
  }

  const fromDomain = resolveFromExpoPublicDomain();
  if (fromDomain) return fromDomain.url;

  if (fromWindow) return fromWindow.url;

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[getApiUrl] EXPO_PUBLIC_DOMAIN is unset; using dev fallback ${DEV_API_FALLBACK}.`);
    return DEV_API_FALLBACK;
  }

  throw new Error(
    "EXPO_PUBLIC_DOMAIN is not set and API base URL could not be inferred.",
  );
}

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`${status}: ${body}`);
    this.status = status;
    this.body = body;
  }
}

function parseJsonApiMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const o = JSON.parse(trimmed) as { error?: unknown; message?: unknown };
    const errLine = typeof o.error === "string" ? o.error.trim() : "";
    const msgLine = typeof o.message === "string" ? o.message.trim() : "";
    const line = errLine || msgLine;
    return line || null;
  } catch {
    return null;
  }
}

/**
 * Human-readable errors for alerts/UI. `ApiError` prefers JSON `error` / `message`; otherwise trims body text.
 */
export function formatUserFacingApiError(err: unknown): string {
  if (err instanceof ApiError) {
    const fromJson = parseJsonApiMessage(err.body);
    if (fromJson) {
      return `${fromJson} (HTTP ${err.status})`;
    }
    const flat = err.body.replace(/\s+/g, " ").trim();
    if (flat.length > 0) {
      const max = 280;
      const cut = flat.length > max ? `${flat.slice(0, max)}…` : flat;
      return `${cut} (HTTP ${err.status})`;
    }
    return `Request failed (HTTP ${err.status})`;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

export async function readAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) return token;
  } catch {
    // ignore AsyncStorage read errors
  }

  if (typeof window !== "undefined") {
    try {
      const token = window.localStorage?.getItem("auth_token");
      if (token) return token;
    } catch {
      // ignore localStorage read errors
    }
  }

  return null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new ApiError(res.status, text);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  const token = await readAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const headers: Record<string, string> = {};
    const token = await readAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
