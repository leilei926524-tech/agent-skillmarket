-- Registered skill builders and freelancers
CREATE TABLE IF NOT EXISTS freelancers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  bio TEXT NOT NULL,
  skills_json TEXT NOT NULL DEFAULT '[]',   -- ["copywriting","python","finance"]
  hourly_rate_usd TEXT,
  availability TEXT NOT NULL DEFAULT 'available', -- available | busy | offline
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS freelancers_availability_idx ON freelancers(availability);

-- Tasks that agents couldn't fulfil with existing skills → matched to freelancers
CREATE TABLE IF NOT EXISTS task_requests (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills_json TEXT NOT NULL DEFAULT '[]',
  budget_usd TEXT,
  status TEXT NOT NULL DEFAULT 'matching',
  -- matching → offered → accepted → in_progress → delivered → paid | cancelled
  matched_freelancer_id TEXT,
  offer_expires_at TEXT,
  submission_url TEXT,
  submission_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(agent_id) REFERENCES agents(id),
  FOREIGN KEY(matched_freelancer_id) REFERENCES freelancers(id)
);

CREATE INDEX IF NOT EXISTS task_requests_status_idx ON task_requests(status, created_at DESC);

-- Email audit trail
CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  task_request_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  template TEXT NOT NULL,     -- offer | reminder | payment_sent | cancelled
  status TEXT NOT NULL DEFAULT 'sent',
  provider_id TEXT,           -- Resend message id
  created_at TEXT NOT NULL,
  FOREIGN KEY(task_request_id) REFERENCES task_requests(id)
);

CREATE INDEX IF NOT EXISTS email_log_task_idx ON email_log(task_request_id);
