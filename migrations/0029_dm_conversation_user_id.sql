ALTER TABLE dm_conversation_messages
ADD COLUMN IF NOT EXISTS user_id integer;

CREATE INDEX IF NOT EXISTS idx_dm_conversation_messages_dm_user_created
ON dm_conversation_messages (dm_id, user_id, created_at);
