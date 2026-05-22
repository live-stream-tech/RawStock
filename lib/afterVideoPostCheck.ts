import { captureClientError } from "@/lib/debugIngest";
import { getCurrentClientRoute } from "@/lib/clientErrorContext";
import type { UploadFlow } from "@/lib/reportUploadFailure";
import { verifyPostedVideoPlayback } from "@/lib/videoPlaybackTelemetry";

export type CreatedVideoRow = {
  id?: number;
  videoUrl?: string | null;
  thumbnail?: string | null;
};

/**
 * Run after POST /api/videos succeeds when the post included a video file.
 * Logs unreachable URLs / WebM warnings to /admin/client-errors.
 */
export async function runAfterVideoPostChecks(input: {
  flow: UploadFlow;
  created: CreatedVideoRow | null | undefined;
  /** URL sent in the request (fallback if API body omits videoUrl). */
  fallbackVideoUrl?: string | null;
  fallbackThumbUrl?: string | null;
}): Promise<void> {
  const videoId = typeof input.created?.id === "number" ? input.created.id : null;
  const videoUrl =
    (typeof input.created?.videoUrl === "string" && input.created.videoUrl.trim()) ||
    (input.fallbackVideoUrl?.trim() ?? "");
  const thumbUrl =
    (typeof input.created?.thumbnail === "string" && input.created.thumbnail.trim()) ||
    (input.fallbackThumbUrl?.trim() ?? "");

  if (!videoUrl) return;

  if (videoId == null) {
    void captureClientError({
      kind: "action_error",
      severity: "warning",
      title: "Post-upload check skipped",
      message: "Video was posted but API response did not include video id; playback verification skipped.",
      route: getCurrentClientRoute(),
      dedupeMs: 0,
      extra: {
        source: "video_playback",
        stage: "post_upload_missing_video_id",
        flow: input.flow,
        hasVideoUrl: true,
      },
    });
    return;
  }

  await verifyPostedVideoPlayback({
    videoId,
    videoUrl,
    flow: input.flow,
    thumbUrl: thumbUrl || null,
  });
}
