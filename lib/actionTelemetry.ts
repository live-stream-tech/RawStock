import { recordClientDebugBreadcrumb, getCurrentClientRoute } from "./clientErrorContext";
import { captureClientError, summarizeForErrorExtra } from "./debugIngest";
import { ApiError } from "./query-client";

type ActionTelemetryInput = {
  action: string;
  title: string;
  route?: string | null;
  requestUrl?: string | null;
  method?: string | null;
  timeoutMs?: number;
  extra?: Record<string, unknown> | null;
};

type ActionTelemetryMeta = Record<string, unknown> | null | undefined;

export type ActionTelemetryController = {
  success: (meta?: ActionTelemetryMeta) => void;
  fail: (err: unknown, meta?: ActionTelemetryMeta) => void;
  cancel: (meta?: ActionTelemetryMeta) => void;
  unexpected: (message: string, meta?: ActionTelemetryMeta) => Promise<void>;
  isSettled: () => boolean;
};

const DEFAULT_ACTION_TIMEOUT_MS = 20_000;

function summarizeMeta(meta: ActionTelemetryMeta): Record<string, unknown> | undefined {
  if (meta == null) return undefined;
  const summarized = summarizeForErrorExtra(meta);
  if (summarized == null) return undefined;
  if (Array.isArray(summarized)) return { values: summarized };
  if (typeof summarized === "object") return summarized as Record<string, unknown>;
  return { value: summarized };
}

function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err.trim();
  try {
    const summarized = summarizeForErrorExtra(err);
    if (typeof summarized === "string" && summarized.trim()) return summarized;
    return JSON.stringify(summarized);
  } catch {
    return "Unknown action failure";
  }
}

export function beginActionTelemetry(input: ActionTelemetryInput): ActionTelemetryController {
  const startedAt = Date.now();
  const route = input.route ?? getCurrentClientRoute();
  const timeoutMs = input.timeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS;
  let settled = false;
  let timedOut = false;

  recordClientDebugBreadcrumb({
    type: "action_start",
    message: input.action,
    route,
    method: input.method ?? null,
    url: input.requestUrl ?? null,
    data: {
      action: input.action,
      timeoutMs,
      ...summarizeMeta(input.extra),
    },
  });

  const timeoutHandle =
    timeoutMs > 0
      ? setTimeout(() => {
          if (settled) return;
          timedOut = true;
          const elapsedMs = Date.now() - startedAt;
          recordClientDebugBreadcrumb({
            type: "action_timeout",
            message: input.action,
            route,
            method: input.method ?? null,
            url: input.requestUrl ?? null,
            data: {
              action: input.action,
              elapsedMs,
              timeoutMs,
              ...summarizeMeta(input.extra),
            },
          });
          void captureClientError({
            kind: "action_error",
            severity: "warning",
            title: input.title,
            message: `${input.title} did not finish within ${Math.round(timeoutMs / 1000)}s.`,
            route,
            requestUrl: input.requestUrl ?? null,
            method: input.method ?? null,
            extra: {
              action: input.action,
              elapsedMs,
              timeoutMs,
              stage: "timeout",
              ...summarizeMeta(input.extra),
            },
          });
        }, timeoutMs)
      : null;

  const clearTimer = () => {
    if (timeoutHandle != null) clearTimeout(timeoutHandle);
  };

  return {
    success(meta) {
      if (settled) {
        recordClientDebugBreadcrumb({
          type: "action_success_after_settle",
          message: input.action,
          route,
          method: input.method ?? null,
          url: input.requestUrl ?? null,
          data: {
            action: input.action,
            afterTimeout: timedOut,
            elapsedMs: Date.now() - startedAt,
            ...summarizeMeta(meta),
          },
        });
        return;
      }
      settled = true;
      clearTimer();
      recordClientDebugBreadcrumb({
        type: timedOut ? "action_success_after_timeout" : "action_success",
        message: input.action,
        route,
        method: input.method ?? null,
        url: input.requestUrl ?? null,
        data: {
          action: input.action,
          elapsedMs: Date.now() - startedAt,
          afterTimeout: timedOut,
          ...summarizeMeta(meta),
        },
      });
    },
    fail(err, meta) {
      if (settled) return;
      settled = true;
      clearTimer();
      const msg = errorMessage(err);
      recordClientDebugBreadcrumb({
        type: timedOut ? "action_fail_after_timeout" : "action_fail",
        message: msg,
        route,
        method: input.method ?? null,
        url: input.requestUrl ?? null,
        data: {
          action: input.action,
          elapsedMs: Date.now() - startedAt,
          afterTimeout: timedOut,
          ...summarizeMeta(meta),
          error: summarizeForErrorExtra(err) as Record<string, unknown>,
        },
      });
      const isUploadRelated =
        /upload|post_submit|media_upload|pick_(photo|video)/i.test(input.action) ||
        input.requestUrl?.includes("upload") ||
        /upload|r2|storage|video|image/i.test(msg);
      void captureClientError({
        kind: "action_error",
        title: input.title,
        message: msg,
        status: err instanceof ApiError ? err.status : null,
        route,
        requestUrl: input.requestUrl ?? null,
        method: input.method ?? null,
        dedupeMs: isUploadRelated ? 0 : undefined,
        extra: {
          action: input.action,
          elapsedMs: Date.now() - startedAt,
          afterTimeout: timedOut,
          ...summarizeMeta(input.extra),
          ...summarizeMeta(meta),
        },
      });
    },
    cancel(meta) {
      if (settled) return;
      settled = true;
      clearTimer();
      recordClientDebugBreadcrumb({
        type: "action_cancel",
        message: input.action,
        route,
        method: input.method ?? null,
        url: input.requestUrl ?? null,
        data: {
          action: input.action,
          elapsedMs: Date.now() - startedAt,
          ...summarizeMeta(meta),
        },
      });
    },
    async unexpected(message, meta) {
      recordClientDebugBreadcrumb({
        type: "action_unexpected_outcome",
        message,
        route,
        method: input.method ?? null,
        url: input.requestUrl ?? null,
        data: {
          action: input.action,
          elapsedMs: Date.now() - startedAt,
          afterTimeout: timedOut,
          ...summarizeMeta(meta),
        },
      });
      await captureClientError({
        kind: "action_error",
        severity: "error",
        title: input.title,
        message,
        route,
        requestUrl: input.requestUrl ?? null,
        method: input.method ?? null,
        extra: {
          action: input.action,
          elapsedMs: Date.now() - startedAt,
          afterTimeout: timedOut,
          ...summarizeMeta(input.extra),
          ...summarizeMeta(meta),
        },
      });
    },
    isSettled() {
      return settled;
    },
  };
}
