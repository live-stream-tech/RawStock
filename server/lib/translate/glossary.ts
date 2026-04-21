/**
 * 用語集（glossary）に登録された固有名詞を、翻訳前にプレースホルダ化する。
 * 翻訳後にプレースホルダを元語（または override_translation）に戻す。
 *
 * 例: 「I love LiveStock!」を ja に翻訳する際、LiveStock を __RS_GLOSS_0__ に置換 →
 *     翻訳エンジンには「I love __RS_GLOSS_0__!」を渡す → 戻り値で __RS_GLOSS_0__ → LiveStock。
 *     これによりエンジン側が固有名詞を「家畜」と誤訳することを防ぐ。
 */

import { db } from "../../db";
import { translationGlossary } from "../../schema";

export interface GlossaryEntry {
  term: string;
  /** "*" で全 locale 共通、それ以外は dstLang と一致したときのみ override 適用 */
  locale: string;
  doNotTranslate: boolean;
  overrideTranslation: string | null;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { entries: GlossaryEntry[]; loadedAt: number } | null = null;

async function loadGlossary(): Promise<GlossaryEntry[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache.entries;
  }
  try {
    const rows = await db.select().from(translationGlossary);
    const entries: GlossaryEntry[] = rows.map((r) => ({
      term: r.term,
      locale: r.locale ?? "*",
      doNotTranslate: r.doNotTranslate,
      overrideTranslation: r.overrideTranslation ?? null,
    }));
    cache = { entries, loadedAt: Date.now() };
    return entries;
  } catch (e) {
    console.warn("loadGlossary failed; using empty glossary", e);
    return cache?.entries ?? [];
  }
}

/** テスト/管理 UI から強制リロードしたい場合に使用 */
export function invalidateGlossaryCache(): void {
  cache = null;
}

const PLACEHOLDER_PREFIX = "__RSGLOSS";
const PLACEHOLDER_SUFFIX = "__";

function makePlaceholder(index: number): string {
  return `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_SUFFIX}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface MaskedText {
  masked: string;
  /** placeholder → 復元すべき文字列。dstLang ごとに override_translation を考慮済み */
  replacements: Map<string, string>;
}

/**
 * 入力テキスト中の glossary 該当語をプレースホルダに置換。
 * 同じ語が複数回出ても 1 つのプレースホルダにまとめる（トークン数節約）。
 */
export async function maskGlossary(text: string, dstLang: string): Promise<MaskedText> {
  const entries = await loadGlossary();
  if (entries.length === 0) return { masked: text, replacements: new Map() };

  // 長い term から先に置換（部分一致の取りこぼし防止）
  const sorted = [...entries].sort((a, b) => b.term.length - a.term.length);

  let masked = text;
  const replacements = new Map<string, string>();
  let nextIndex = 0;

  for (const entry of sorted) {
    if (!entry.term) continue;
    if (!entry.doNotTranslate && !entry.overrideTranslation) continue;

    const pattern = new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, "gi");
    if (!pattern.test(masked)) continue;

    const placeholder = makePlaceholder(nextIndex++);
    const restoreTo =
      entry.overrideTranslation && (entry.locale === "*" || entry.locale === dstLang)
        ? entry.overrideTranslation
        : entry.term;

    masked = masked.replace(new RegExp(`\\b${escapeRegExp(entry.term)}\\b`, "gi"), placeholder);
    replacements.set(placeholder, restoreTo);
  }

  return { masked, replacements };
}

/** maskGlossary 後の翻訳結果からプレースホルダを実値に戻す */
export function unmaskGlossary(translated: string, replacements: Map<string, string>): string {
  if (replacements.size === 0) return translated;
  let out = translated;
  for (const [placeholder, value] of replacements) {
    // 翻訳エンジンが大文字/小文字をいじる可能性に備えて大文字小文字無視で復元
    out = out.replace(new RegExp(escapeRegExp(placeholder), "gi"), value);
  }
  return out;
}
