/** Per-post limits for daily (quick) posts — Instagram/X style clips. */
export const DAILY_POST_LIMITS = {
  /** Max media items (photos + videos combined). */
  maxMediaCount: 3,
  /** At most one video. */
  maxVideoCount: 1,
  /** Max size per file (MB). Large originals are compressed on upload where supported. */
  maxFileSizeMB: 500,
  /** Max video length (seconds). */
  maxVideoDurationSec: 30,
  /** Max text length (characters). */
  maxTextLength: 500,
} as const;

/** Per-post limits for work posts — long-form continuation videos. */
export const WORK_POST_LIMITS = {
  /** Max size per file (MB). Large originals are compressed on upload where supported. */
  maxFileSizeMB: 800,
  /** Max attached video length (seconds). */
  maxVideoDurationSec: 3600,
} as const;

/** @deprecated Use WORK_POST_LIMITS.maxVideoDurationSec */
export const WORK_VIDEO_MAX_DURATION_SEC = WORK_POST_LIMITS.maxVideoDurationSec;
