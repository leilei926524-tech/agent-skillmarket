-- ============================================================
-- ExpertOS demo seed data
-- ============================================================
--
-- Paste this into your Cloudflare D1 Console AFTER you have:
--   1. Imported Tim's expertos-backup.sql
--   2. Run `wrangler d1 migrations apply DB --remote` to apply
--      the payout_split, freelancer_email, and freelancer_safety
--      migrations that live on main.
--
-- BEFORE PASTING: replace YOUR_REAL_EMAIL_HERE below with the
-- Gmail address that should receive the demo task offer email.
-- ============================================================


-- ---- one demo freelancer -----------------------------------
-- The task_match endpoint requires:
--   availability='available' AND verified=1 AND email_consent=1
INSERT INTO freelancers (
  id, name, email, bio, skills_json, hourly_rate_usd,
  availability, verified, email_consent, payout_wallet,
  created_at, updated_at
) VALUES (
  'fl_demo_alice',
  'Alice Chen',
  'YOUR_REAL_EMAIL_HERE',
  'Senior data analyst with 8 years of SaaS pricing and compliance experience. Helps agents with pricing exceptions, deal desk approvals, and enterprise questionnaires.',
  '["python","data-analysis","pricing","compliance","saas","refund","approval"]',
  '120.00',
  'available',
  1,
  1,
  NULL,
  datetime('now'),
  datetime('now')
);


-- ---- one demo agent with a known API key --------------------
-- Plaintext key (Claude Code uses this in Authorization header):
--   expertos_demo_ck_9e2b7f4a83c1d54e6f8b
-- SHA-256 hash of that key (this is what the DB stores):
--   ee8f420685e3db12ffe6b25c8e3eefec18fec2513a40ff02522042b106395d6a
INSERT INTO agents (
  id, name, owner_email, purpose, api_key_hash, api_key_prefix,
  daily_budget_usd, status, created_at, last_seen_at
) VALUES (
  'agent_demo_atlas',
  'Atlas Demo Agent',
  'YOUR_REAL_EMAIL_HERE',
  'Demo agent for Claude Code integration walkthrough.',
  'ee8f420685e3db12ffe6b25c8e3eefec18fec2513a40ff02522042b106395d6a',
  'expertos_demo',
  '10.00',
  'active',
  datetime('now'),
  datetime('now')
);
