-- Email campaign system: campaigns, per-recipient delivery log, unsubscribe list

CREATE TABLE IF NOT EXISTS email_campaigns (
  id               SERIAL PRIMARY KEY,
  campaign_key     TEXT NOT NULL UNIQUE,
  subject          TEXT NOT NULL,
  body_html        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft',
  dry_run          BOOLEAN NOT NULL DEFAULT TRUE,
  target_count     INTEGER NOT NULL DEFAULT 0,
  sent_count       INTEGER NOT NULL DEFAULT 0,
  failed_count     INTEGER NOT NULL DEFAULT 0,
  sent_by_user_id  INTEGER NOT NULL,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_deliveries (
  id           SERIAL PRIMARY KEY,
  campaign_id  INTEGER NOT NULL,
  user_id      INTEGER NOT NULL,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'queued',
  error        TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_deliveries_campaign
  ON email_deliveries (campaign_id);

CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
