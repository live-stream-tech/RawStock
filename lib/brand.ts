/** Default wordmark CDN — override with PUBLIC_LOGO_URL (e.g. in server env). */
const DEFAULT_RAWSTOCK_LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663449879480/M2pBP9b9EdXaS65j3mPhNW/RawStock_logo_3fd8a263.webp";

export const RAWSTOCK_LOGO_URL =
  (typeof process !== "undefined" && process.env.PUBLIC_LOGO_URL?.trim()) ||
  DEFAULT_RAWSTOCK_LOGO_URL;

/** Placeholder in server-served HTML templates; replaced at request time. */
export const RAWSTOCK_LOGO_URL_PLACEHOLDER = "RAWSTOCK_LOGO_URL_PLACEHOLDER";
