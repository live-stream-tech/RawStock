import { alertMessage } from "@/lib/alertCompat";
import { captureClientError } from "@/lib/debugIngest";
import { getCurrentClientRoute } from "@/lib/clientErrorContext";
import type { UploadFlow } from "@/lib/reportUploadFailure";
import { reportUploadFailure } from "@/lib/reportUploadFailure";

export type UploadActionContext = {
  flow: UploadFlow;
  stage: string;
  mediaType?: "image" | "video";
};

type BlockOptions = {
  /** Shown in admin + optional alert. */
  message: string;
  /** Alert title (defaults to "Could not add media"). */
  title?: string;
  /** Show a user-visible alert (recommended for real blocks). */
  alert?: boolean;
  extra?: Record<string, unknown>;
};

/**
 * Log when the user tapped an upload control but nothing happened (or could not start).
 * Always sent to POST /api/client-errors (dedupe off).
 */
export function reportUploadBlocked(ctx: UploadActionContext, options: BlockOptions): void {
  void captureClientError({
    kind: "action_error",
    severity: "warning",
    title: options.title ?? "Could not add media",
    message: options.message,
    route: getCurrentClientRoute(),
    dedupeMs: 0,
    extra: {
      source: "upload",
      blocked: true,
      stage: ctx.stage,
      flow: ctx.flow,
      mediaType: ctx.mediaType ?? null,
      ...options.extra,
    },
  });
  if (options.alert) {
    alertMessage(options.title ?? "Could not add media", options.message);
  }
}

/** User dismissed the file picker without choosing a file. */
export function reportUploadPickerCancelled(ctx: UploadActionContext): void {
  void captureClientError({
    kind: "action_error",
    severity: "info",
    title: "Picker cancelled",
    message: "User closed the file picker without selecting a file.",
    route: getCurrentClientRoute(),
    dedupeMs: 2000,
    extra: {
      source: "upload",
      stage: `${ctx.stage}_cancelled`,
      flow: ctx.flow,
      mediaType: ctx.mediaType ?? null,
    },
  });
}

/**
 * If `allowed` is false, logs (and optionally alerts) then returns false.
 * Use at the top of pick handlers: `if (!allowUploadAction(ok, ctx, opts)) return;`
 */
export function allowUploadAction(
  allowed: boolean,
  ctx: UploadActionContext,
  options: BlockOptions,
): allowed is true {
  if (allowed) return true;
  reportUploadBlocked(ctx, options);
  return false;
}

/** Re-export for pickers that already use failure reporting on real errors. */
export { reportUploadFailure };
