/** Shared validation for video_editors pricing (per_minute | revenue_share | both). */

export type EditorPricingInput = {
  priceType: string;
  pricePerMinute: number | null | undefined;
  revenueSharePercent: number | null | undefined;
};

export function validateEditorPricing(
  row: EditorPricingInput,
): { ok: true } | { ok: false; error: string } {
  const pt = row.priceType;
  if (pt !== "per_minute" && pt !== "revenue_share" && pt !== "both") {
    return { ok: false, error: "Invalid pricing type" };
  }
  const pm = row.pricePerMinute ?? null;
  const rs = row.revenueSharePercent ?? null;

  if (pt === "per_minute") {
    if (pm == null || !Number.isInteger(pm) || pm <= 0) {
      return { ok: false, error: "Enter per-minute price (🎫/min) as a positive integer" };
    }
    if (rs != null) {
      return { ok: false, error: "Revenue share % cannot be set in per-minute mode" };
    }
  } else if (pt === "revenue_share") {
    if (rs == null || !Number.isInteger(rs) || rs < 1 || rs > 100) {
      return { ok: false, error: "Creator share must be an integer from 1 to 100" };
    }
    if (pm != null) {
      return { ok: false, error: "Per-minute price cannot be set in revenue-share mode" };
    }
  } else {
    if (pm == null || !Number.isInteger(pm) || pm <= 0) {
      return { ok: false, error: "Per-minute price (🎫/min) is required when using both" };
    }
    if (rs == null || !Number.isInteger(rs) || rs < 1 || rs > 100) {
      return { ok: false, error: "Creator share (1–100) is required when using both" };
    }
  }
  return { ok: true };
}

/** Normalize tag strings to URL-safe slugs for storage and search. */
export function normalizeEditorStyleTagSlugs(input: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const s = raw
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
    if (s.length > 0 && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

export function parseTagsQueryParam(q: unknown): string[] {
  if (q == null) return [];
  const parts: string[] = [];
  if (Array.isArray(q)) {
    for (const x of q) parts.push(...String(x).split(","));
  } else {
    parts.push(...String(q).split(","));
  }
  return normalizeEditorStyleTagSlugs(parts);
}

/** Comma-separated genre labels from search UI; lowercased for substring match against `videoEditors.genres`. */
export function parseGenresQueryParam(q: unknown): string[] {
  if (q == null) return [];
  const parts: string[] = [];
  if (Array.isArray(q)) {
    for (const x of q) parts.push(...String(x).split(","));
  } else {
    parts.push(...String(q).split(","));
  }
  const out = parts.map((p) => p.trim().toLowerCase()).filter(Boolean);
  return [...new Set(out)];
}
