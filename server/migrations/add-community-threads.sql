-- コミュニティ掲示板（スレッド形式）
-- Neon SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS community_threads (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT NOW(),
  pinned BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS community_thread_posts (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_threads_community_id ON community_threads(community_id);
CREATE INDEX IF NOT EXISTS idx_community_thread_posts_thread_id ON community_thread_posts(thread_id);
