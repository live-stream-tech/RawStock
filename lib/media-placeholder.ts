/**
 * Inline SVG — no external HTTP, works offline, matches app dark surfaces.
 * Use when thumbnails / flyers are missing or failed to load.
 */
export const MEDIA_PLACEHOLDER_DATA_URI =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0d0d0d"/><stop offset="100%" stop-color="#1a1a1a"/>
      </linearGradient></defs>
      <rect width="800" height="520" fill="url(#g)"/>
      <rect x="80" y="100" width="640" height="320" rx="12" fill="none" stroke="#00ffcc" stroke-opacity="0.12" stroke-width="2"/>
      <path fill="none" stroke="#5a5650" stroke-width="2" stroke-linecap="round"
        d="M320 300l60-72 80 96 100-128 80 104"/>
      <circle cx="360" cy="220" r="28" fill="none" stroke="#5a5650" stroke-width="2"/>
    </svg>`,
  );
