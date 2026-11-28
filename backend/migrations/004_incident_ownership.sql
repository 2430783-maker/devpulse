ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS user_id BIGINT
REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_incidents_user_id
ON incidents(user_id);
