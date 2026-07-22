ALTER TABLE agents ADD COLUMN revoked_at TEXT;

CREATE INDEX IF NOT EXISTS agents_status_created_idx ON agents(status, created_at DESC);
CREATE INDEX IF NOT EXISTS invocations_agent_status_created_idx ON invocations(agent_id, status, created_at DESC);
