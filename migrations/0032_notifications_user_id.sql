ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS user_id INTEGER;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS target_path TEXT;

CREATE INDEX IF NOT EXISTS notifications_user_id_created_at_idx
  ON notifications (user_id, created_at DESC);
