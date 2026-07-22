-- Add seller payout fields to skills and submissions
ALTER TABLE skills ADD COLUMN payout_wallet TEXT;
ALTER TABLE skills ADD COLUMN publisher_email TEXT;
ALTER TABLE submissions ADD COLUMN payout_wallet TEXT;

-- Track seller payouts queued after platform receives buyer payment
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  invocation_id TEXT NOT NULL UNIQUE,
  skill_id TEXT NOT NULL,
  recipient_wallet TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  network TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  settled_at TEXT,
  FOREIGN KEY(invocation_id) REFERENCES invocations(id),
  FOREIGN KEY(skill_id) REFERENCES skills(id)
);

CREATE INDEX IF NOT EXISTS payouts_status_created_idx ON payouts(status, created_at);
CREATE INDEX IF NOT EXISTS payouts_invocation_idx ON payouts(invocation_id);
