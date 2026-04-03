-- 投稿タイプ: daily=日常投稿, work=作品（ランキング対象）
ALTER TABLE videos ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'daily';
