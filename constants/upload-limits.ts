/** Per-post limits for daily (quick) posts. */
export const DAILY_POST_LIMITS = {
  /** Max media items (photos + videos combined). */
  maxMediaCount: 3,
  /** At most one video. */
  maxVideoCount: 1,
  /** Max size per file (MB). Large originals are compressed on upload where supported. */
  maxFileSizeMB: 500,
  /** Max video length (seconds). */
  maxVideoDurationSec: 60,
  /** Max text length (characters). */
  maxTextLength: 500,
} as const;

/** Per-post limits for work posts. */
export const WORK_POST_LIMITS = {
  /** Max size per file (MB). Large originals are compressed on upload where supported. */
  maxFileSizeMB: 800,
} as const;
