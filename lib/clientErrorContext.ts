import { Platform } from "react-native";

type ClientDebugBreadcrumb = {
  type: string;
  message: string;
  route?: string | null;
  status?: number | null;
  method?: string | null;
  url?: string | null;
  timestamp: number;
  data?: Record<string, unknown>;
};

const BREADCRUMB_LIMIT = 20;
const WEB_SESSION_KEY = "rawstock_client_error_session_v1";

let currentRoute: string | null = null;
let currentUserId: number | null = null;
let cachedSessionId: string | null = null;
const breadcrumbs: ClientDebugBreadcrumb[] = [];

function makeSessionId(): string {
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {
    /* ignore */
  }
  return `ce_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getClientErrorSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    try {
      const existing = window.sessionStorage?.getItem(WEB_SESSION_KEY);
      if (existing) {
        cachedSessionId = existing;
        return existing;
      }
      const created = makeSessionId();
      window.sessionStorage?.setItem(WEB_SESSION_KEY, created);
      cachedSessionId = created;
      return created;
    } catch {
      /* ignore */
    }
  }
  cachedSessionId = makeSessionId();
  return cachedSessionId;
}

export function setCurrentClientRoute(route: string | null | undefined): void {
  currentRoute = route?.trim() || null;
}

export function getCurrentClientRoute(): string | null {
  return currentRoute;
}

export function setCurrentClientActor(userId: number | null | undefined): void {
  currentUserId = typeof userId === "number" && Number.isFinite(userId) ? userId : null;
}

export function getCurrentClientActor(): number | null {
  return currentUserId;
}

export function recordClientDebugBreadcrumb(input: Omit<ClientDebugBreadcrumb, "timestamp"> & { timestamp?: number }): void {
  breadcrumbs.push({
    ...input,
    timestamp: input.timestamp ?? Date.now(),
  });
  while (breadcrumbs.length > BREADCRUMB_LIMIT) {
    breadcrumbs.shift();
  }
}

export function getRecentClientDebugBreadcrumbs(): ClientDebugBreadcrumb[] {
  return breadcrumbs.slice(-BREADCRUMB_LIMIT);
}
