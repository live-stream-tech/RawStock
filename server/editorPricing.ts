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
    return { ok: false, error: "不正な料金形式です" };
  }
  const pm = row.pricePerMinute ?? null;
  const rs = row.revenueSharePercent ?? null;

  if (pt === "per_minute") {
    if (pm == null || !Number.isInteger(pm) || pm <= 0) {
      return { ok: false, error: "分単価（🎫/分）を正の整数で入力してください" };
    }
    if (rs != null) {
      return { ok: false, error: "分単価モードではレベニューシェア％は指定できません" };
    }
  } else if (pt === "revenue_share") {
    if (rs == null || !Number.isInteger(rs) || rs < 1 || rs > 100) {
      return { ok: false, error: "クリエイター取り分は1〜100の整数で入力してください" };
    }
    if (pm != null) {
      return { ok: false, error: "レベニューシェアモードでは分単価は指定できません" };
    }
  } else {
    if (pm == null || !Number.isInteger(pm) || pm <= 0) {
      return { ok: false, error: "both では分単価（🎫/分）が必須です" };
    }
    if (rs == null || !Number.isInteger(rs) || rs < 1 || rs > 100) {
      return { ok: false, error: "both ではクリエイター取り分（1〜100）が必須です" };
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
