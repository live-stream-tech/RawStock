-- Google OAuth トークン（YouTube プレイリスト取得用）
-- Neon SQL Editor で実行してください
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMP;
