-- Official RawStock hub communities (see scripts/reset-official-communities.ts)
ALTER TABLE communities ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;
