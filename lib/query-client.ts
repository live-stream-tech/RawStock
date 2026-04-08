import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:5000")
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  const host = process.env.EXPO_PUBLIC_DOMAIN;
  let source: "env" | "window" | "localhost-dev" | "error" = "error";
  let resolved = "";

  if (host) {
    const normalized = host.startsWith("http") ? host : `http://${host}`;
    resolved = new URL(normalized).origin + "/";
    source = "env";
    // #region agent log
    fetch("http://127.0.0.1:7508/ingest/394829cb-326c-4cb8-ad25-91374b2c7523", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "88cb7d" },
      body: JSON.stringify({
        sessionId: "88cb7d",
        runId: "initial",
        hypothesisId: "H1",
        location: "lib/query-client.ts:getApiUrl",
        message: "Resolved API base URL",
        data: { source, resolved },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return resolved;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    resolved = window.location.origin + "/";
    source = "window";
    // #region agent log
    fetch("http://127.0.0.1:7508/ingest/394829cb-326c-4cb8-ad25-91374b2c7523", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "88cb7d" },
      body: JSON.stringify({
        sessionId: "88cb7d",
        runId: "initial",
        hypothesisId: "H1",
        location: "lib/query-client.ts:getApiUrl",
        message: "Resolved API base URL",
        data: { source, resolved },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return resolved;
  }

  // Native 開発環境向けのフォールバック
  // サーバーのデフォルトポート (server/index.ts) は 5000
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[getApiUrl] EXPO_PUBLIC_DOMAIN が未設定のため、開発用に http://localhost:5000/ を使用します。",
    );
    resolved = "http://localhost:5000/";
    source = "localhost-dev";
    // #region agent log
    fetch("http://127.0.0.1:7508/ingest/394829cb-326c-4cb8-ad25-91374b2c7523", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "88cb7d" },
      body: JSON.stringify({
        sessionId: "88cb7d",
        runId: "initial",
        hypothesisId: "H1",
        location: "lib/query-client.ts:getApiUrl",
        message: "Resolved API base URL",
        data: { source, resolved },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return resolved;
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
  // #region agent log
  fetch("http://127.0.0.1:7508/ingest/394829cb-326c-4cb8-ad25-91374b2c7523", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "88cb7d" },
    body: JSON.stringify({
      sessionId: "88cb7d",
      runId: "initial",
      hypothesisId: "H2",
      location: "lib/query-client.ts:apiRequest",
      message: "Issuing API request",
      data: { method, route, url: url.toString(), hasBody: Boolean(data) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  try {
    const token = await AsyncStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // ignore token fetch errors
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
    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch {
      // ignore token fetch errors
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
