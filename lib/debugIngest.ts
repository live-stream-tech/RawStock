import {
  getClientErrorSessionId,
  getCurrentClientActor,
  getCurrentClientRoute,
  getRecentClientDebugBreadcrumbs,
  recordClientDebugBreadcrumb,
} from "./clientErrorContext";

export type ClientErrorKind = "ui_alert" | "api_error" | "render_error" | "auth_error" | "action_error";
export type ClientErrorSeverity = "error" | "warning" | "info";

export type ClientErrorEvent = {
  kind: ClientErrorKind;
  severity: ClientErrorSeverity;
  title: string | null;
  message: string;
  status: number | null;
  code: string | null;
  route: string | null;
  requestUrl: string | null;
  method: string | null;
  sessionId: string;
  userId: number | null;
  platform: string;
  userAgent: string | null;
  stack: string | null;
  componentStack: string | null;
  fingerprint: string;
  extra: Record<string, unknown> | null;
  createdAt: string;
};

export type CaptureClientErrorInput = {
  kind: ClientErrorKind;
  title?: string | null;
  message: string;
  severity?: ClientErrorSeverity;
  status?: number | null;
  code?: string | null;
  route?: string | null;
  requestUrl?: string | null;
  method?: string | null;
  stack?: string | null;
  componentStack?: string | null;
  extra?: Record<string, unknown> | null;
  dedupeMs?: number;
};

const CLIENT_ERROR_MAX_STRING = 4000;
const EXTRA_VALUE_MAX_STRING = 300;
const EXTRA_ARRAY_LIMIT = 10;
const EXTRA_OBJECT_LIMIT = 20;
const RECENT_FINGERPRINT_TTL_MS = 5_000;
const recentFingerprintSentAt = new Map<string, number>();

function truncateString(input: string, max = CLIENT_ERROR_MAX_STRING): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max)}…`;
}

function allowBrowserDebugIngest(): boolean {
  if (typeof __DEV__ !== "undefined" && !__DEV__) return false;
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1";
}

function summarizeUnknown(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "string") return truncateString(value, EXTRA_VALUE_MAX_STRING);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function") return "[function]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message, EXTRA_VALUE_MAX_STRING),
    };
  }
  if (typeof Blob !== "undefined" && value instanceof Blob) {
    return { blob: true, size: value.size, type: value.type || null };
  }
  if (Array.isArray(value)) {
    if (depth >= 2) return { type: "array", length: value.length };
    return value.slice(0, EXTRA_ARRAY_LIMIT).map((item) => summarizeUnknown(item, depth + 1));
  }
  if (typeof value === "object") {
    if (depth >= 2) return { type: "object", keys: Object.keys(value as Record<string, unknown>).slice(0, EXTRA_OBJECT_LIMIT) };
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>).slice(0, EXTRA_OBJECT_LIMIT)) {
      if (/authorization|cookie|token|password|secret/i.test(key)) {
        out[key] = "[redacted]";
        continue;
      }
      out[key] = summarizeUnknown(nested, depth + 1);
    }
    return out;
  }
  return String(value);
}

export function summarizeForErrorExtra(value: unknown): unknown {
  return summarizeUnknown(value);
}

function currentPlatformLabel(): string {
  if (typeof navigator !== "undefined" && navigator.userAgent) {
    return "web";
  }
  if (typeof process !== "undefined" && process.env.EXPO_OS) {
    return process.env.EXPO_OS ?? "unknown";
  }
  return "unknown";
}

function currentUserAgent(): string | null {
  if (typeof navigator === "undefined") return null;
  return truncateString(navigator.userAgent, 512);
}

function currentRouteFromRuntime(): string | null {
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.pathname}${window.location.search}`;
  }
  return null;
}

function fingerprintFromExtra(extra: Record<string, unknown> | null | undefined): string {
  if (!extra) return "";
  const source = typeof extra.source === "string" ? extra.source : "";
  const stage = typeof extra.stage === "string" ? extra.stage : "";
  const action = typeof extra.action === "string" ? extra.action : "";
  const surface = typeof extra.surface === "string" ? extra.surface : "";
  return [source, stage, action, surface].filter(Boolean).join("|");
}

function computeFingerprint(
  event: Omit<ClientErrorEvent, "fingerprint">,
  extraInput?: Record<string, unknown> | null,
): string {
  const parts = [
    event.kind,
    event.status ?? "",
    event.code ?? "",
    event.route ?? event.requestUrl ?? "",
    event.method ?? "",
    fingerprintFromExtra(extraInput),
    event.message,
  ];
  return truncateString(parts.join("|"), 500);
}

function clientBuildMeta(): Record<string, unknown> {
  try {
    const Constants = require("expo-constants").default as {
      expoConfig?: { version?: string };
      nativeAppVersion?: string;
    };
    const version =
      Constants.expoConfig?.version?.trim() ||
      Constants.nativeAppVersion?.trim() ||
      null;
    return version ? { appVersion: version } : {};
  } catch {
    return {};
  }
}

function shouldDedupe(fingerprint: string, dedupeMs: number): boolean {
  const now = Date.now();
  const last = recentFingerprintSentAt.get(fingerprint) ?? 0;
  recentFingerprintSentAt.set(fingerprint, now);
  for (const [key, sentAt] of recentFingerprintSentAt) {
    if (now - sentAt > RECENT_FINGERPRINT_TTL_MS) recentFingerprintSentAt.delete(key);
  }
  return now - last < dedupeMs;
}

async function postClientErrorEvent(event: ClientErrorEvent): Promise<void> {
  try {
    const { getApiUrl, readAuthToken } = await import("./query-client");
    const url = new URL("/api/client-errors", getApiUrl()).toString();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = await readAuthToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    await fetch(url, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(event),
    });
  } catch {
    /* swallow: never loop on diagnostics */
  }
}

function sendToLegacyLocalIngest(port: 7508 | 7349, sessionId: string, body: Record<string, unknown>): void {
  if (!allowBrowserDebugIngest()) return;
  const ingestId =
    port === 7349
      ? "7dff581f-bd1a-45e7-a59d-07959fb1fc8e"
      : "394829cb-326c-4cb8-ad25-91374b2c7523";
  fetch(`http://127.0.0.1:${port}/ingest/${ingestId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": sessionId },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export async function captureClientError(input: CaptureClientErrorInput): Promise<void> {
  const summarizedExtra = input.extra == null ? null : summarizeUnknown(input.extra);
  const baseEvent = {
    kind: input.kind,
    severity: input.severity ?? "error",
    title: input.title?.trim() ? truncateString(input.title.trim(), 200) : null,
    message: truncateString(input.message || "Unknown error"),
    status: typeof input.status === "number" ? input.status : null,
    code: input.code ? truncateString(String(input.code), 120) : null,
    route: input.route ?? getCurrentClientRoute() ?? currentRouteFromRuntime(),
    requestUrl: input.requestUrl ? truncateString(input.requestUrl, 500) : null,
    method: input.method ? truncateString(input.method.toUpperCase(), 16) : null,
    sessionId: getClientErrorSessionId(),
    userId: getCurrentClientActor(),
    platform: currentPlatformLabel(),
    userAgent: currentUserAgent(),
    stack: input.stack ? truncateString(input.stack) : null,
    componentStack: input.componentStack ? truncateString(input.componentStack) : null,
    extra:
      summarizedExtra == null
        ? { ...clientBuildMeta(), recentEvents: getRecentClientDebugBreadcrumbs() }
        : Array.isArray(summarizedExtra)
          ? { ...clientBuildMeta(), context: summarizedExtra, recentEvents: getRecentClientDebugBreadcrumbs() }
          : typeof summarizedExtra === "object"
            ? {
                ...clientBuildMeta(),
                ...(summarizedExtra as Record<string, unknown>),
                recentEvents: getRecentClientDebugBreadcrumbs(),
              }
            : {
                ...clientBuildMeta(),
                context: summarizedExtra,
                recentEvents: getRecentClientDebugBreadcrumbs(),
              },
    createdAt: new Date().toISOString(),
  };

  const fpExtra =
    input.extra != null && typeof input.extra === "object" && !Array.isArray(input.extra)
      ? (input.extra as Record<string, unknown>)
      : null;

  const event: ClientErrorEvent = {
    ...baseEvent,
    fingerprint: computeFingerprint(baseEvent, fpExtra),
  };

  const dedupeMs = input.dedupeMs ?? RECENT_FINGERPRINT_TTL_MS;
  if (shouldDedupe(event.fingerprint, dedupeMs)) return;

  recordClientDebugBreadcrumb({
    type: "captured_error",
    message: event.message,
    route: event.route,
    status: event.status,
    method: event.method,
    url: event.requestUrl,
    data: { kind: event.kind, code: event.code, title: event.title },
  });

  await postClientErrorEvent(event);
}

export function debugIngestLocal(body: Record<string, unknown>): void {
  recordClientDebugBreadcrumb({
    type: "debug_local",
    message: typeof body.message === "string" ? truncateString(body.message, 180) : "debug_local",
    route: getCurrentClientRoute() ?? currentRouteFromRuntime(),
    data: summarizeUnknown(body) as Record<string, unknown>,
  });
  sendToLegacyLocalIngest(7508, "88cb7d", body);
}

/** ErrorBoundary hook (separate debug ingest port) */
export function debugIngestErrorBoundary(body: Record<string, unknown>): void {
  sendToLegacyLocalIngest(7349, "47cd06", body);
  const data = (body.data ?? {}) as Record<string, unknown>;
  void captureClientError({
    kind: "render_error",
    title: "Render crash",
    message:
      typeof data.errorMessage === "string"
        ? data.errorMessage
        : typeof body.message === "string"
          ? body.message
          : "Error boundary caught an error",
    stack: typeof data.errorStack === "string" ? data.errorStack : null,
    componentStack: typeof data.componentStack === "string" ? data.componentStack : null,
    extra: summarizeUnknown(body) as Record<string, unknown>,
  });
}
