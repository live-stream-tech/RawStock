-- 動画再生用カラム追加
-- Neon SQL Editor で実行してください
ALTER TABLE videos ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS youtube_id TEXT;
