-- 翻訳キャッシュ（同じ (src, dst, hash) に対する重複呼び出しを抑止）
CREATE TABLE IF NOT EXISTS "translations" (
  "id" serial PRIMARY KEY NOT NULL,
  "src_lang" text NOT NULL,
  "dst_lang" text NOT NULL,
  "text_hash" text NOT NULL,
  "source_text" text NOT NULL,
  "translated_text" text NOT NULL,
  "engine" text NOT NULL DEFAULT 'mymemory',
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "translations_unique_idx"
  ON "translations" ("src_lang", "dst_lang", "text_hash");

-- 用語集（固有名詞ガード）。do_not_translate=true のものはトークン化して翻訳エンジンに渡さない。
-- override_translation を locale 別に持てば「Liver→ライバー」のように手動上書きも可能。
CREATE TABLE IF NOT EXISTS "translation_glossary" (
  "id" serial PRIMARY KEY NOT NULL,
  "term" text NOT NULL,
  "locale" text NOT NULL DEFAULT '*',
  "do_not_translate" boolean NOT NULL DEFAULT true,
  "override_translation" text,
  "scope" text NOT NULL DEFAULT 'global',
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "translation_glossary_term_locale_idx"
  ON "translation_glossary" ("term", "locale");

-- ブランド・固有名詞の初期シード（locale='*' で全方向に適用）
INSERT INTO "translation_glossary" ("term", "locale", "do_not_translate", "scope")
VALUES
  ('RawStock', '*', true, 'global'),
  ('LiveStock', '*', true, 'global'),
  ('Jukebox', '*', true, 'global'),
  ('District', '*', true, 'global'),
  ('Liver', '*', true, 'global'),
  ('Editor', '*', true, 'global'),
  ('RawCoin', '*', true, 'global')
ON CONFLICT DO NOTHING;
