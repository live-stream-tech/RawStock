-- コミュニティアンケート
-- Neon SQL Editor で実行してください

CREATE TABLE IF NOT EXISTS community_polls (
  id SERIAL PRIMARY KEY,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  end_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS community_poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES community_polls(id) ON DELETE CASCADE,
  option_id INTEGER NOT NULL REFERENCES community_poll_options(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(poll_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_community_polls_community_id ON community_polls(community_id);
CREATE INDEX IF NOT EXISTS idx_community_poll_options_poll_id ON community_poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_community_poll_votes_poll_id ON community_poll_votes(poll_id);
