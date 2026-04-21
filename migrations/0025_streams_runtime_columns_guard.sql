-- Guard migration for environments that missed historical stream schema changes.
-- Safe to run multiple times.

ALTER TABLE streams
  ADD COLUMN IF NOT EXISTS host_user_id integer,
  ADD COLUMN IF NOT EXISTS is_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS started_at timestamp,
  ADD COLUMN IF NOT EXISTS ended_at timestamp,
  ADD COLUMN IF NOT EXISTS whip_url text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS ticket_price integer,
  ADD COLUMN IF NOT EXISTS restricted_community_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'streams_restricted_community_id_fkey'
  ) THEN
    ALTER TABLE streams
      ADD CONSTRAINT streams_restricted_community_id_fkey
      FOREIGN KEY (restricted_community_id) REFERENCES communities(id);
  END IF;
END $$;
