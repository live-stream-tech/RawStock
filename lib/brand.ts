/** Default wordmark CDN — override with PUBLIC_LOGO_URL (e.g. in server env). */
const DEFAULT_RAWSTOCK_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/M2pBP9b9EdXaS65j3mPhNW/RawStock_logo_3fd8a263.webp";

/** Default hero loop. Replace via PUBLIC_HERO_VIDEO_URL for production. */
const DEFAULT_HERO_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

const DEFAULT_HERO_POSTER_URL =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1920&q=80";

export const RAWSTOCK_LOGO_URL =
  (typeof process !== "undefined" && process.env.PUBLIC_LOGO_URL?.trim()) ||
  DEFAULT_RAWSTOCK_LOGO_URL;

export const RAWSTOCK_HERO_VIDEO_URL =
  (typeof process !== "undefined" && process.env.PUBLIC_HERO_VIDEO_URL?.trim()) ||
  DEFAULT_HERO_VIDEO_URL;

export const RAWSTOCK_HERO_POSTER_URL =
  (typeof process !== "undefined" && process.env.PUBLIC_HERO_POSTER_URL?.trim()) ||
  DEFAULT_HERO_POSTER_URL;

/** How it works — optional imagery (Unsplash). */
export const RAWSTOCK_LP_STEP_IMG_SHOOT =
  process.env.PUBLIC_LP_STEP_SHOOT_IMG?.trim() ||
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80";
export const RAWSTOCK_LP_STEP_IMG_EDIT =
  process.env.PUBLIC_LP_STEP_EDIT_IMG?.trim() ||
  "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80";
export const RAWSTOCK_LP_STEP_IMG_SELL =
  process.env.PUBLIC_LP_STEP_SELL_IMG?.trim() ||
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80";
export const RAWSTOCK_LP_STEP_IMG_PROMO =
  process.env.PUBLIC_LP_STEP_PROMO_IMG?.trim() ||
  "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80";

/** Feature cards (generic live / UI mood). */
export const RAWSTOCK_LP_FEATURE_IMG_JUKE =
  process.env.PUBLIC_LP_FEATURE_JUKE_IMG?.trim() ||
  "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=960&q=80";
export const RAWSTOCK_LP_FEATURE_IMG_AI =
  process.env.PUBLIC_LP_FEATURE_AI_IMG?.trim() ||
  "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=960&q=80";
export const RAWSTOCK_LP_FEATURE_IMG_DISTRICT =
  process.env.PUBLIC_LP_FEATURE_DISTRICT_IMG?.trim() ||
  "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=960&q=80";
export const RAWSTOCK_LP_FEATURE_IMG_LIVE =
  process.env.PUBLIC_LP_FEATURE_LIVE_IMG?.trim() ||
  "https://images.unsplash.com/photo-1540039155733-5bb30b53aa88?w=960&q=80";
export const RAWSTOCK_LP_FEATURE_IMG_GLOBAL =
  process.env.PUBLIC_LP_FEATURE_GLOBAL_IMG?.trim() ||
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=960&q=80";

/** Placeholder strings replaced in server-served HTML. */
export const RAWSTOCK_LOGO_URL_PLACEHOLDER = "RAWSTOCK_LOGO_URL_PLACEHOLDER";
export const RAWSTOCK_HERO_VIDEO_URL_PLACEHOLDER =
  "RAWSTOCK_HERO_VIDEO_URL_PLACEHOLDER";
export const RAWSTOCK_HERO_POSTER_URL_PLACEHOLDER =
  "RAWSTOCK_HERO_POSTER_URL_PLACEHOLDER";
export const LP_CANONICAL_URL_PLACEHOLDER = "LP_CANONICAL_URL_PLACEHOLDER";
export const RAWSTOCK_LP_STEP_IMG_SHOOT_PLACEHOLDER =
  "RAWSTOCK_LP_STEP_IMG_SHOOT_PLACEHOLDER";
export const RAWSTOCK_LP_STEP_IMG_EDIT_PLACEHOLDER =
  "RAWSTOCK_LP_STEP_IMG_EDIT_PLACEHOLDER";
export const RAWSTOCK_LP_STEP_IMG_SELL_PLACEHOLDER =
  "RAWSTOCK_LP_STEP_IMG_SELL_PLACEHOLDER";
export const RAWSTOCK_LP_STEP_IMG_PROMO_PLACEHOLDER =
  "RAWSTOCK_LP_STEP_IMG_PROMO_PLACEHOLDER";
export const RAWSTOCK_LP_FEATURE_IMG_JUKE_PLACEHOLDER =
  "RAWSTOCK_LP_FEATURE_IMG_JUKE_PLACEHOLDER";
export const RAWSTOCK_LP_FEATURE_IMG_AI_PLACEHOLDER =
  "RAWSTOCK_LP_FEATURE_IMG_AI_PLACEHOLDER";
export const RAWSTOCK_LP_FEATURE_IMG_DISTRICT_PLACEHOLDER =
  "RAWSTOCK_LP_FEATURE_IMG_DISTRICT_PLACEHOLDER";
export const RAWSTOCK_LP_FEATURE_IMG_LIVE_PLACEHOLDER =
  "RAWSTOCK_LP_FEATURE_IMG_LIVE_PLACEHOLDER";
export const RAWSTOCK_LP_FEATURE_IMG_GLOBAL_PLACEHOLDER =
  "RAWSTOCK_LP_FEATURE_IMG_GLOBAL_PLACEHOLDER";
