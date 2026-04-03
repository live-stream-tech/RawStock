-- Add editor_id to editing_requests table
-- Links each editing request to a specific video editor (video_editors.id)
-- Nullable: requests without a chosen editor remain valid (unassigned)
ALTER TABLE editing_requests ADD COLUMN IF NOT EXISTS editor_id INTEGER;
