-- 0006: Safety hardening for the human-freelancer fallback workflow.
-- Strictly additive: no data is deleted or rewritten; all defaults are safe.

-- Freelancers: explicit email consent (default FALSE) and a durable payout wallet.
ALTER TABLE freelancers ADD COLUMN email_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE freelancers ADD COLUMN payout_wallet TEXT;

-- Task requests: secure action token (hash only), agent idempotency,
-- lifecycle timestamps, and payment audit fields.
ALTER TABLE task_requests ADD COLUMN action_token_hash TEXT;
ALTER TABLE task_requests ADD COLUMN idempotency_key TEXT;
ALTER TABLE task_requests ADD COLUMN accepted_at TEXT;
ALTER TABLE task_requests ADD COLUMN delivered_at TEXT;
ALTER TABLE task_requests ADD COLUMN paid_at TEXT;
ALTER TABLE task_requests ADD COLUMN payment_tx_hash TEXT;
ALTER TABLE task_requests ADD COLUMN payment_error TEXT;

-- One task per (agent, idempotency key): replay-safe task creation.
CREATE UNIQUE INDEX IF NOT EXISTS task_requests_agent_idem_uq
  ON task_requests(agent_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- At most one successfully-sent email per task/template: duplicate-send guard.
CREATE UNIQUE INDEX IF NOT EXISTS email_log_task_template_sent_uq
  ON email_log(task_request_id, template)
  WHERE status = 'sent';

-- Durable freelancer payout records: one payout row per task, with attempt
-- counting, status, transaction hash, and (internal-only) error state.
CREATE TABLE IF NOT EXISTS task_payouts (
  id TEXT PRIMARY KEY,
  task_request_id TEXT NOT NULL UNIQUE,
  recipient_wallet TEXT NOT NULL,
  amount_usd TEXT NOT NULL,
  network TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | settled | failed
  attempts INTEGER NOT NULL DEFAULT 0,
  tx_hash TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(task_request_id) REFERENCES task_requests(id)
);

CREATE INDEX IF NOT EXISTS task_payouts_status_idx ON task_payouts(status);
