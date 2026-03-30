-- Instagram, YouTube, X チャンネルURL用カラム追加
-- Neon SQL Editor で実行してください
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS x_url TEXT;
