/**
 * 自動翻訳ファサード。
 *
 * フロー:
 *   1. srcLang === dstLang なら何もしない
 *   2. 短語スキップ判定（LiveStock 単体 → 家畜事故防止）
 *   3. glossary でブランド名をプレースホルダ化
 *   4. キャッシュ確認（src, dst, sha256(text)）
 *   5. 翻訳エンジン呼び出し（既定: MyMemory）
 *   6. プレースホルダ復元
 *   7. キャッシュ保存
 *
 * エンジン差し替えは TRANSLATE_ENGINE 環境変数で行う想定（未実装エンジンは MyMemory にフォールバック）。
 */

import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { translations } from "../../schema";
import { maskGlossary, unmaskGlossary } from "./glossary";
import { myMemoryTranslate, MyMemoryError } from "./mymemory";
import { shouldSkipTranslation } from "./shortText";

export type TranslateEngine = "mymemory";

export interface TranslateInput {
  text: string;
  srcLang: string;
  dstLang: string;
}

export type TranslateSkipReason =
  | "same_lang"
  | "empty"
  | "too_short_words"
  | "too_short_visible"
  | "non_textual";

export interface TranslateResult {
  /** 翻訳後の文字列。skipped=true のときは原文をそのまま返す */
  text: string;
  fromCache: boolean;
  skipped: boolean;
  skipReason?: TranslateSkipReason;
  engine: TranslateEngine;
  /** 翻訳エンジンに到達したが失敗した場合 true（原文を返す） */
  error?: boolean;
}

function selectedEngine(): TranslateEngine {
  const e = (process.env.TRANSLATE_ENGINE ?? "").toLowerCase();
  if (e === "mymemory" || e === "") return "mymemory";
  console.warn(`Unknown TRANSLATE_ENGINE=${e}; falling back to mymemory`);
  return "mymemory";
}

function normalizeForHash(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

function hashText(text: string): string {
  return crypto.createHash("sha256").update(normalizeForHash(text)).digest("hex");
}

async function readFromCache(
  srcLang: string,
  dstLang: string,
  textHash: string,
): Promise<string | null> {
  try {
    const [row] = await db
      .select({ translatedText: translations.translatedText })
      .from(translations)
      .where(
        and(
          eq(translations.srcLang, srcLang),
          eq(translations.dstLang, dstLang),
          eq(translations.textHash, textHash),
        ),
      )
      .limit(1);
    return row?.translatedText ?? null;
  } catch (e) {
    console.warn("translations cache read failed", e);
    return null;
  }
}

async function writeToCache(args: {
  srcLang: string;
  dstLang: string;
  textHash: string;
  sourceText: string;
  translatedText: string;
  engine: TranslateEngine;
}): Promise<void> {
  try {
    await db
      .insert(translations)
      .values({
        srcLang: args.srcLang,
        dstLang: args.dstLang,
        textHash: args.textHash,
        sourceText: args.sourceText,
        translatedText: args.translatedText,
        engine: args.engine,
      })
      .onConflictDoNothing();
  } catch (e) {
    console.warn("translations cache write failed", e);
  }
}

export async function translateText(input: TranslateInput): Promise<TranslateResult> {
  const engine = selectedEngine();
  const text = input.text ?? "";
  const srcLang = (input.srcLang ?? "").toLowerCase();
  const dstLang = (input.dstLang ?? "").toLowerCase();

  if (!srcLang || !dstLang || srcLang === dstLang) {
    return { text, fromCache: false, skipped: true, skipReason: "same_lang", engine };
  }

  const decision = shouldSkipTranslation(text);
  if (decision.skip) {
    return {
      text,
      fromCache: false,
      skipped: true,
      skipReason: (decision.reason ?? "empty") as TranslateSkipReason,
      engine,
    };
  }

  const textHash = hashText(text);
  const cached = await readFromCache(srcLang, dstLang, textHash);
  if (cached !== null) {
    return { text: cached, fromCache: true, skipped: false, engine };
  }

  // glossary はキャッシュ ミス後にだけ実施（キャッシュヒット時は完成形が保存されている）
  const { masked, replacements } = await maskGlossary(text, dstLang);

  try {
    const result =
      engine === "mymemory"
        ? await myMemoryTranslate(masked, srcLang, dstLang)
        : await myMemoryTranslate(masked, srcLang, dstLang);

    const restored = unmaskGlossary(result.translatedText, replacements);
    const finalText = restored.trim();

    if (finalText && finalText !== masked) {
      await writeToCache({
        srcLang,
        dstLang,
        textHash,
        sourceText: text,
        translatedText: finalText,
        engine,
      });
    }

    return { text: finalText || text, fromCache: false, skipped: false, engine };
  } catch (e) {
    if (e instanceof MyMemoryError) {
      console.warn("translateText engine error", e.message);
    } else {
      console.warn("translateText unexpected error", e);
    }
    return { text, fromCache: false, skipped: false, engine, error: true };
  }
}
