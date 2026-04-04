/**
 * Shared vocabulary for editor registration and creator-side editor search.
 * Keep slugs aligned with server `normalizeEditorStyleTagSlugs` / `GET /api/editors?tags=`.
 */

export const EDITOR_GENRE_OPTIONS = [
  "YouTube",
  "Short Video",
  "MV",
  "Gaming",
  "Variety",
  "Business",
  "Education",
  "Artist",
  "Cinematic",
  "Anime",
  "Vlog",
  "Vertical",
  "Social Media",
  "Highlights",
  "Seminar",
] as const;

export const EDITOR_DELIVERY_PRESETS = ["1", "2", "3", "5", "7", "14"] as const;

/** Display label + persisted slug (matches seed / API tag filter). */
export const EDITOR_STYLE_TAG_OPTIONS: { label: string; slug: string }[] = [
  { label: "2000s cyber", slug: "00s-cyber" },
  { label: "Speedy cut", slug: "speedy-cut" },
  { label: "VHS filter", slug: "vhs-filter" },
  { label: "Raw texture", slug: "raw-texture" },
];
