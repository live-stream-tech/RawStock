/**
 * 短語スキップ判定。
 *
 * 「LiveStock 単体 → 家畜」のような誤訳事故を構造的に防ぐため、以下のいずれかに該当する
 * 入力は翻訳エンジンに渡さず原文のまま返す。
 *
 * - 単語数が SHORT_WORD_THRESHOLD 以下
 * - 可視文字（空白・記号を除外）が SHORT_VISIBLE_THRESHOLD 以下
 * - 英数字記号のみ（URL・ハンドル・絵文字のみ等）
 *
 * しきい値は計画書に従う（≤2 単語 OR ≤8 可視文字）。
 */

const SHORT_WORD_THRESHOLD = 2;
const SHORT_VISIBLE_THRESHOLD = 8;

const NON_TEXTUAL_RE = /^[\s\d\W_]+$/u;

export interface ShortTextDecision {
  skip: boolean;
  reason?: "too_short_words" | "too_short_visible" | "non_textual" | "empty";
}

export function shouldSkipTranslation(input: string): ShortTextDecision {
  const trimmed = input.trim();
  if (!trimmed) return { skip: true, reason: "empty" };

  if (NON_TEXTUAL_RE.test(trimmed)) {
    return { skip: true, reason: "non_textual" };
  }

  const visibleLength = trimmed.replace(/\s+/g, "").length;
  if (visibleLength <= SHORT_VISIBLE_THRESHOLD) {
    return { skip: true, reason: "too_short_visible" };
  }

  const wordCount = trimmed.split(/\s+/u).filter(Boolean).length;
  if (wordCount <= SHORT_WORD_THRESHOLD) {
    return { skip: true, reason: "too_short_words" };
  }

  return { skip: false };
}
