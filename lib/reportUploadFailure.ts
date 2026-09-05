import { getCurrentClientRoute } from "./clientErrorContext";
import { captureClientError } from "./debugIngest";
import { ApiError, formatUserFacingApiError } from "./query-client";

export type UploadFlow = "daily" | "work" | "profile" | "community" | "dm" | "ai_edit" | "other";

export type ReportUploadFailureInput = {
  title: string;
  err?: unknown;
  message?: string;
  stage: string;
  flow: UploadFlow;
  mediaType?: "image" | "video";
  fileSizeBytes?: number;
  requestUrl?: string;
  method?: string;
};

/**
 * Always ingests upload failures (dedupe off) so the first failure in a session is never lost.
 */
export function reportUploadFailure(input: ReportUploadFailureInput): void {
  const message =
    input.message?.trim() ||
    (input.err != null ? formatUserFacingApiError(input.err) : "") ||
    "Upload failed";
  const status = input.err instanceof ApiError ? input.err.status : null;
  // Client-side validation / user choice / transient network — keep UI alerts elsewhere, skip admin noise.
  if (
    /too large|picker cancelled|user cancelled|closed the file picker|load failed|failed to fetch|network request failed/i.test(
      message,
    )
  ) {
    return;
  }

  void captureClientError({
    kind: "action_error",
    title: input.title,
    message,
    status,
    route: getCurrentClientRoute(),
    requestUrl: input.requestUrl ?? "/api/upload-file",
    method: input.method ?? "POST",
    dedupeMs: 0,
    extra: {
      source: "upload",
      stage: input.stage,
      flow: input.flow,
      mediaType: input.mediaType ?? null,
      fileSizeBytes: input.fileSizeBytes ?? null,
    },
  });
}
