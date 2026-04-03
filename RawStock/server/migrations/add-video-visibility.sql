-- 自分のページとコミュニティ投稿の分離
-- Neon SQL Editor で実行してください
ALTER TABLE videos ADD COLUMN IF NOT EXISTS user_id INTEGER;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'community';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS community_id INTEGER;

-- 既存データ: visibility を community に統一
UPDATE videos SET visibility = 'community' WHERE visibility IS NULL;
