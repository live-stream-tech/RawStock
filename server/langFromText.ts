/** これ未満は franc が不安定なため検知しない */
const MIN_LENGTH = 10;

/** franc は ISO 639-3。API・DB は ISO 639-1 に揃える（マップ外は保存しない） */
const ISO639_3_TO_1: Record<string, string> = {
  jpn: "ja",
  eng: "en",
  kor: "ko",
  zho: "zh",
  cmn: "zh",
  spa: "es",
  fra: "fr",
  deu: "de",
  por: "pt",
  ita: "it",
  vie: "vi",
  tha: "th",
  ind: "id",
  rus: "ru",
  arb: "ar",
};

/**
 * 投稿・プロフィール・DM 等のテキストから言語を推定する。
 * 失敗・不確実時は null（呼び出し側はリクエストを続行する）。
 *
 * `franc` は ESM のみのため、Vercel の CJS バンドルでは dynamic import が必要（ERR_REQUIRE_ESM 回避）。
 */
export async function detectContentLang(text: string): Promise<string | null> {
  try {
    const t = text.trim();
    if (t.length < MIN_LENGTH) return null;
    const { franc } = await import("franc");
    const code = franc(t);
    if (code === "und") return null;
    return ISO639_3_TO_1[code] ?? null;
  } catch {
    return null;
  }
}
