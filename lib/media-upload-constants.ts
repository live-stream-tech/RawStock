/** Vercel same-origin upload cap (~4.5MB request body). */
export const R2_SAME_ORIGIN_UPLOAD_MAX_BYTES = 4 * 1024 * 1024;

/** Max prepared video size on web (under per-post MB limits; ~1h at light quality). */
export const WEB_VIDEO_PREP_MAX_OUTPUT_BYTES = 500 * 1024 * 1024;
