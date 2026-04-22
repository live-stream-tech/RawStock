CREATE TABLE IF NOT EXISTS lp_leads (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'email_form',
  locale TEXT,
  campaign TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS lp_leads_email_unique ON lp_leads (email);
