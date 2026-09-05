import { Platform } from "react-native";
import { alertMessage } from "@/lib/alertCompat";
import {
  getCurrentClientRoute,
  recordClientDebugBreadcrumb,
} from "@/lib/clientErrorContext";
import { captureClientError, summarizeForErrorExtra } from "@/lib/debugIngest";
import { extractAppUploadR2KeyFromUrl } from "@/lib/r2-public-url";
import { resolvePublicMediaUri } from "@/lib/resolve-public-media-uri";
import type { UploadFlow } from "@/lib/reportUploadFailure";

export type VideoPlaybackSurface = "video_detail" | "global_mini" | "play_tap";

export type VideoPlaybackContext = {
  surface: VideoPlaybackSurface;
  videoId?: number | null;
  /** URL stored on the post (before resolvePublicMediaUri). */
  rawUrl?: string | null;
  resolvedUrl?: string | null;
  flow?: UploadFlow | null;
};

const LOAD_TIMEOUT_MS = 20_000;
const STALL_WARN_MS = 10_000;

function mediaErrorCodeLabel(code: number | undefined): string {
  switch (code) {
    case MediaError.MEDIA_ERR_ABORTED:
      return "MEDIA_ERR_ABORTED";
    case MediaError.MEDIA_ERR_NETWORK:
      return "MEDIA_ERR_NETWORK";
    case MediaError.MEDIA_ERR_DECODE:
      return "MEDIA_ERR_DECODE";
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "MEDIA_ERR_SRC_NOT_SUPPORTED";
    default:
      return code != null ? `MEDIA_ERR_${code}` : "MEDIA_ERR_UNKNOWN";
  }
}

function snapshotVideoElement(v: HTMLVideoElement | null | undefined): Record<string, unknown> {
  if (!v) return {};
  return {
    networkState: v.networkState,
    readyState: v.readyState,
    paused: v.paused,
    ended: v.ended,
    currentTime: Number.isFinite(v.currentTime) ? v.currentTime : null,
    duration: Number.isFinite(v.duration) ? v.duration : null,
    videoWidth: v.videoWidth,
    videoHeight: v.videoHeight,
    mediaErrorCode: v.error?.code ?? null,
    mediaErrorMessage: v.error?.message ?? null,
    mediaErrorLabel: mediaErrorCodeLabel(v.error?.code),
  };
}

function buildExtra(
  ctx: VideoPlaybackContext,
  stage: string,
  more?: Record<string, unknown>,
): Record<string, unknown> {
  const raw = ctx.rawUrl?.trim() ?? "";
  const resolved = ctx.resolvedUrl?.trim() ?? "";
  const key = extractAppUploadR2KeyFromUrl(resolved || raw);
  return {
    source: "video_playback",
    stage,
    surface: ctx.surface,
    videoId: ctx.videoId ?? null,
    flow: ctx.flow ?? null,
    rawUrl: raw ? raw.slice(0, 300) : null,
    resolvedUrl: resolved ? resolved.slice(0, 300) : null,
    r2Key: key,
    urlExt: (resolved || raw).split("?")[0]?.split(".").pop()?.toLowerCase() ?? null,
    isProxyUrl: /\/api\/r2-public\//i.test(resolved || raw),
    ...more,
  };
}

function isLikelyUnsupportedBrowserCodec(ctx: VideoPlaybackContext, message: string): boolean {
  const url = (ctx.resolvedUrl ?? ctx.rawUrl ?? "").split("?")[0]?.toLowerCase() ?? "";
  const ext = url.split(".").pop() ?? "";
  const m = message.toLowerCase();
  return (
    ext === "mov" ||
    ext === "qt" ||
    m.includes("not supported") ||
    m.includes("operation is not supported") ||
    m.includes("media_err_src_not_supported") ||
    m.includes("demuxer") ||
    m.includes("format error")
  );
}

/**
 * Always ingested (dedupe off) so playback failures are visible in /admin/client-errors.
 */
export function reportVideoPlaybackIssue(input: {
  stage: string;
  message: string;
  title?: string;
  severity?: "error" | "warning" | "info";
  ctx: VideoPlaybackContext;
  videoEl?: HTMLVideoElement | null;
  err?: unknown;
  more?: Record<string, unknown>;
  /** Show a short alert so the user knows playback failed (not silent). */
  alertUser?: boolean;
  dedupeMs?: number;
}): void {
  const codecIssue = isLikelyUnsupportedBrowserCodec(input.ctx, input.message);
  const severity = input.severity ?? (codecIssue ? "warning" : "error");
  const title = input.title ?? "Video playback failed";
  const message = codecIssue
    ? "This video format may not play in the browser (e.g. .mov / QuickTime). Re-upload as MP4 (H.264) for reliable web playback."
    : input.message;

  recordClientDebugBreadcrumb({
    type: "video_playback",
    message: `${input.stage}: ${message}`,
    route: getCurrentClientRoute(),
    data: buildExtra(input.ctx, input.stage, {
      ...snapshotVideoElement(input.videoEl),
      err: summarizeForErrorExtra(input.err),
      codecIssue,
      ...input.more,
    }),
  });

  void captureClientError({
    kind: "action_error",
    severity,
    title,
    message,
    route: getCurrentClientRoute(),
    dedupeMs: input.dedupeMs ?? (codecIssue ? 60_000 : 0),
    extra: buildExtra(input.ctx, input.stage, {
      ...snapshotVideoElement(input.videoEl),
      err: summarizeForErrorExtra(input.err),
      codecIssue,
      ...input.more,
    }),
  });

  if (input.alertUser && (severity === "error" || codecIssue)) {
    alertMessage(title, message);
  }
}

export type VideoUrlProbeResult = {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  error: string | null;
};

/** HEAD/GET probe from the browser (same-origin proxy or R2 public URL). */
export async function probeVideoUrlReachable(url: string): Promise<VideoUrlProbeResult> {
  const resolved = resolvePublicMediaUri(url);
  if (!resolved || resolved.startsWith("data:")) {
    return { ok: false, status: null, contentType: null, error: "Empty or invalid video URL" };
  }

  try {
    const head = await fetch(resolved, { method: "HEAD", credentials: "omit" });
    if (head.ok) {
      const ct = head.headers.get("content-type");
      return { ok: true, status: head.status, contentType: ct, error: null };
    }
    if (head.status === 405 || head.status === 501) {
      const getRes = await fetch(resolved, {
        method: "GET",
        headers: { Range: "bytes=0-1" },
        credentials: "omit",
      });
      const ct = getRes.headers.get("content-type");
      if (getRes.ok || getRes.status === 206) {
        return { ok: true, status: getRes.status, contentType: ct, error: null };
      }
      return {
        ok: false,
        status: getRes.status,
        contentType: ct,
        error: `GET ${getRes.status}`,
      };
    }
    return {
      ok: false,
      status: head.status,
      contentType: head.headers.get("content-type"),
      error: `HEAD ${head.status}`,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: null, contentType: null, error: msg };
  }
}

/** After post submit: verify the stored video URL is reachable from the client. */
export async function verifyPostedVideoPlayback(input: {
  videoId: number;
  videoUrl: string;
  flow: UploadFlow;
  thumbUrl?: string | null;
}): Promise<void> {
  const ctx: VideoPlaybackContext = {
    surface: "play_tap",
    videoId: input.videoId,
    rawUrl: input.videoUrl,
    flow: input.flow,
  };
  const resolved = resolvePublicMediaUri(input.videoUrl);
  ctx.resolvedUrl = resolved;

  const ext = resolved.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "webm") {
    reportVideoPlaybackIssue({
      stage: "post_upload_webm_codec",
      title: "Video format notice",
      message:
        "This video was saved as WebM. Safari and some mobile browsers may not play it. Re-upload as MP4 or use Upload without compressing on work posts.",
      severity: "warning",
      ctx,
      dedupeMs: 60_000,
    });
  }

  const probe = await probeVideoUrlReachable(input.videoUrl);
  if (!probe.ok) {
    reportVideoPlaybackIssue({
      stage: "post_upload_url_unreachable",
      message: `Posted video URL is not reachable (${probe.error ?? "unknown"}, HTTP ${probe.status ?? "n/a"}). Check R2 public URL / CORS / proxy.`,
      ctx: { ...ctx, resolvedUrl: resolved },
      alertUser: false,
      more: { probeStatus: probe.status, probeContentType: probe.contentType, probeError: probe.error },
    });
    return;
  }

  if (probe.contentType && !/^video\//i.test(probe.contentType) && probe.contentType !== "application/octet-stream") {
    reportVideoPlaybackIssue({
      stage: "post_upload_wrong_content_type",
      message: `Posted video URL returned Content-Type "${probe.contentType}" (expected video/*). Playback may fail.`,
      severity: "warning",
      ctx: { ...ctx, resolvedUrl: resolved },
      dedupeMs: 30_000,
    });
  }

  recordClientDebugBreadcrumb({
    type: "video_playback",
    message: "post_upload_url_ok",
    route: getCurrentClientRoute(),
    data: buildExtra(ctx, "post_upload_url_ok", {
      status: probe.status,
      contentType: probe.contentType,
    }),
  });
}

/** Call when the user taps play on a post. */
export async function logPlaybackStart(ctx: VideoPlaybackContext): Promise<void> {
  if (Platform.OS !== "web") {
    reportVideoPlaybackIssue({
      stage: "native_file_playback",
      title: "Native playback",
      message:
        "File playback on iOS/Android uses URL probe only; inline HTML5 monitor is web-only. If audio never starts, check GlobalMyListPlayer / native player wiring.",
      severity: "info",
      ctx,
      dedupeMs: 60_000,
      alertUser: false,
    });
  }

  const raw = ctx.rawUrl?.trim() ?? "";
  if (!raw) {
    reportVideoPlaybackIssue({
      stage: "play_missing_video_url",
      message: "Play was tapped but this post has no videoUrl.",
      ctx,
      alertUser: true,
    });
    return;
  }

  const resolved = resolvePublicMediaUri(raw);
  ctx.resolvedUrl = resolved;

  recordClientDebugBreadcrumb({
    type: "video_playback",
    message: "play_start",
    route: getCurrentClientRoute(),
    data: buildExtra(ctx, "play_start"),
  });

  const probe = await probeVideoUrlReachable(raw);
  if (!probe.ok) {
    reportVideoPlaybackIssue({
      stage: "play_url_unreachable",
      message: `Cannot load video (${probe.error ?? "unknown"}, HTTP ${probe.status ?? "n/a"}).`,
      ctx,
      alertUser: true,
    });
    return;
  }

  if (probe.contentType && !/^video\//i.test(probe.contentType) && probe.contentType !== "application/octet-stream") {
    reportVideoPlaybackIssue({
      stage: "play_wrong_content_type",
      message: `Video URL returned Content-Type "${probe.contentType}".`,
      severity: "warning",
      ctx,
      dedupeMs: 15_000,
    });
  }
}

/**
 * Attach listeners to an HTMLVideoElement (web only). Returns cleanup.
 */
export function attachHtmlVideoPlaybackMonitor(
  video: HTMLVideoElement,
  ctx: VideoPlaybackContext,
  options?: {
    onFatal?: () => void;
    loadTimeoutMs?: number;
    alertUser?: boolean;
  },
): () => void {
  if (Platform.OS !== "web") return () => {};

  const resolved = resolvePublicMediaUri(ctx.resolvedUrl ?? ctx.rawUrl ?? video.src);
  const fullCtx: VideoPlaybackContext = { ...ctx, resolvedUrl: resolved };
  let disposed = false;
  let stallTimer: ReturnType<typeof setTimeout> | null = null;
  let loadTimer: ReturnType<typeof setTimeout> | null = null;
  let stallReported = false;
  let loadReported = false;

  const clearTimers = () => {
    if (stallTimer) clearTimeout(stallTimer);
    if (loadTimer) clearTimeout(loadTimer);
    stallTimer = null;
    loadTimer = null;
  };

  const fatal = (stage: string, message: string, more?: Record<string, unknown>) => {
    if (disposed) return;
    reportVideoPlaybackIssue({
      stage,
      message,
      ctx: fullCtx,
      videoEl: video,
      alertUser: options?.alertUser ?? true,
      more,
    });
    options?.onFatal?.();
  };

  const onError = () => {
    const code = video.error?.code;
    fatal(
      "html_video_error",
      video.error?.message ?? `Video element error (${mediaErrorCodeLabel(code)})`,
    );
  };

  const onStalled = () => {
    if (stallReported || stallTimer) return;
    stallTimer = setTimeout(() => {
      if (disposed || video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return;
      stallReported = true;
      reportVideoPlaybackIssue({
        stage: "html_video_stalled",
        message: "Video stalled while loading (network or CDN issue).",
        severity: "warning",
        ctx: fullCtx,
        videoEl: video,
        dedupeMs: 30_000,
      });
    }, STALL_WARN_MS);
  };

  const onPlaying = () => {
    clearTimers();
    recordClientDebugBreadcrumb({
      type: "video_playback",
      message: "html_video_playing",
      route: getCurrentClientRoute(),
      data: buildExtra(fullCtx, "html_video_playing", snapshotVideoElement(video)),
    });
  };

  const onLoadedMetadata = () => {
    if (loadReported) return;
    loadReported = true;
    if (loadTimer) clearTimeout(loadTimer);
    recordClientDebugBreadcrumb({
      type: "video_playback",
      message: "html_video_metadata",
      route: getCurrentClientRoute(),
      data: buildExtra(fullCtx, "html_video_metadata", snapshotVideoElement(video)),
    });
  };

  video.addEventListener("error", onError);
  video.addEventListener("stalled", onStalled);
  video.addEventListener("waiting", onStalled);
  video.addEventListener("playing", onPlaying);
  video.addEventListener("loadedmetadata", onLoadedMetadata);
  video.addEventListener("canplay", onPlaying);

  loadTimer = setTimeout(() => {
    if (disposed || video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
    fatal(
      "html_video_load_timeout",
      `Video did not load within ${options?.loadTimeoutMs ?? LOAD_TIMEOUT_MS}ms.`,
      { loadTimeoutMs: options?.loadTimeoutMs ?? LOAD_TIMEOUT_MS },
    );
  }, options?.loadTimeoutMs ?? LOAD_TIMEOUT_MS);

  void video.play().catch((err: unknown) => {
    reportVideoPlaybackIssue({
      stage: "html_video_play_rejected",
      message: err instanceof Error ? err.message : String(err),
      severity: "warning",
      ctx: fullCtx,
      videoEl: video,
      err,
      alertUser: options?.alertUser ?? false,
      dedupeMs: 5000,
    });
  });

  return () => {
    disposed = true;
    clearTimers();
    video.removeEventListener("error", onError);
    video.removeEventListener("stalled", onStalled);
    video.removeEventListener("waiting", onStalled);
    video.removeEventListener("playing", onPlaying);
    video.removeEventListener("loadedmetadata", onLoadedMetadata);
    video.removeEventListener("canplay", onPlaying);
  };
}
