-- ユーザーが UI 表示・自動翻訳の宛先として選んだ言語（ISO 639-1, 例: ja, en）
-- 既存の users.last_content_lang は「投稿テキストから franc で検知した直近言語」なので別カラム。
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language" TEXT;
