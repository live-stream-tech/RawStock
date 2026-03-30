-- プロフィール公開用: エニアグラム・厳選コミュニティ4つ
-- Neon SQL Editor で実行してください
ALTER TABLE users ADD COLUMN IF NOT EXISTS enneagram_scores TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pinned_community_ids TEXT;
