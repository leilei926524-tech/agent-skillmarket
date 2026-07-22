import { Hono, type Context, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AgentRecord, Env, SkillRecord, Variables } from "./types";
import { BodyError, isSafeHttpUrl, jsonError, nowIso, parseJson, publicSkill, randomToken, readJsonBody, sha256 } from "./utils";
import { scanSkill } from "./scan";
import { executeSkill } from "./execution";
import { paymentSignatureHash, x402Gate } from "./payment";
import { sendCancelledEmail, sendOfferEmail, sendPaymentEmail } from "./email";
import { sendUSDCPayment } from "./payout";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
type AppEnv = { Bindings: Env; Variables: Variables };
type AppContext = Context<AppEnv, string>;

const requestLogger = logger();
// Skip logging for the offer review route: its URL carries the task token.
app.use("/api/*", async (c, next) => {
  if (/^\/api\/v1\/tasks\/[^/]+\/offer$/.test(c.req.path)) return next();
  return requestLogger(c, next);
});
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "PAYMENT-SIGNATURE", "X-PAYMENT", "X-Submission-Token", "X-Admin-Key"],
    exposeHeaders: ["PAYMENT-REQUIRED", "PAYMENT-RESPONSE"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    maxAge: 86400,
  }),
);

app.onError((error, c) => {
  if (error instanceof BodyError) return jsonError(c, error.status, error.code, error.message, error.details);
  console.error(error);
  return jsonError(c, 500, "internal_error", "The marketplace could not complete this request.");
});

app.get("/api/health", (c) => c.json({ ok: true, service: "gokui-marketplace", environment: c.env.APP_ENV }));

app.get("/.well-known/agent-skills.json", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.json({
    name: "GOKUI Agent Skill Marketplace",
    version: "1.0.0",
    protocols: ["REST", "x402-v2"],
    access: {
      register: `${origin}/api/v1/agents/access`,
      search: `${origin}/api/v1/agent/skills`,
      recommend: `${origin}/api/v1/agent/recommend`,
      authentication: "Authorization: Bearer <agent_api_key>",
    },
    payment: {
      scheme: "exact",
      network: c.env.X402_NETWORK,
      amountUsd: c.env.X402_PRICE_USD,
      headers: ["PAYMENT-REQUIRED", "PAYMENT-SIGNATURE", "PAYMENT-RESPONSE"],
    },
    catalog: {
      deliveryTypes: ["paid_api", "external_source"],
      disclosure: "Paid APIs run behind x402. Community-curated source packages open a pinned upstream version and are not sold by GOKUI.",
    },
    safety: "Automated checks reduce risk but are not an endorsement. Review third-party skills and permissions before use.",
  });
});

async function listSkills(c: AppContext) {
  const q = (c.req.query("q") || "").trim().toLowerCase();
  const category = (c.req.query("category") || "").trim().toLowerCase();
  const maxPrice = Number(c.req.query("maxPrice") || "0");
  const rows = await c.env.DB.prepare(
    "SELECT * FROM skills WHERE status = 'approved' ORDER BY invokes DESC, updated_at DESC",
  ).all<SkillRecord>();
  const origin = new URL(c.req.url).origin;
  const skills = rows.results.filter((skill) => {
    const haystack = `${skill.slug} ${skill.title} ${skill.description} ${skill.category} ${skill.tags_json}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (category && skill.category.toLowerCase() !== category) return false;
    if (maxPrice > 0 && Number(skill.price_usd) > maxPrice) return false;
    return true;
  });
  return c.json({ skills: skills.map((skill) => publicSkill(skill, origin)), total: skills.length });
}

app.get("/api/v1/skills", listSkills);

app.get("/api/v1/skills/:slug", async (c) => {
  const skill = await c.env.DB.prepare(
    "SELECT * FROM skills WHERE slug = ? AND status = 'approved'",
  ).bind(c.req.param("slug")).first<SkillRecord>();
  if (!skill) return jsonError(c, 404, "skill_not_found", "No approved skill uses that slug.");
  return c.json({ skill: publicSkill(skill, new URL(c.req.url).origin) });
});

app.get("/api/v1/public/stats", async (c) => {
  const skillCount = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM skills WHERE status = 'approved'").first<{ count: number }>();
  const submissionCount = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM submissions").first<{ count: number }>();
  const invocationCount = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM invocations WHERE status = 'settled'").first<{ count: number }>();
  return c.json({
    skills: skillCount?.count || 0,
    submissions: submissionCount?.count || 0,
    settledInvocations: invocationCount?.count || 0,
    network: c.env.X402_NETWORK,
    mode: c.env.APP_ENV,
  });
});

app.get("/api/v1/public/activity", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT i.id, i.tx_hash, i.network, i.amount_usd, i.status, i.created_at,
            s.slug AS skill_slug, s.title AS skill_title, a.api_key_prefix AS agent_prefix
       FROM invocations i
       JOIN skills s ON s.id = i.skill_id
       JOIN agents a ON a.id = i.agent_id
      WHERE i.status = 'settled'
      ORDER BY i.created_at DESC LIMIT 50`,
  ).all<Record<string, unknown>>();
  return c.json({ activity: rows.results });
});

app.post("/api/v1/submissions", async (c) => {
  const body = await readJsonBody(c);
  if (!body || typeof body !== "object") return jsonError(c, 422, "invalid_submission", "Submission must be an object.");
  const input = body as Record<string, unknown>;
  const skillMarkdown = String(input.skillMarkdown || "");
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  const publisherName = String(input.publisherName || "").trim();
  const publisherEmail = String(input.publisherEmail || "").trim().toLowerCase();
  const githubUrl = String(input.githubUrl || "").trim();
  const payoutWallet = String(input.payoutWallet || "").trim();
  const categories = Array.isArray(input.categories) ? input.categories.map(String).map((v) => v.trim()).filter(Boolean).slice(0, 3) : [];
  const usageExamples = Array.isArray(input.usageExamples) ? input.usageExamples.map(String).map((v) => v.trim()).filter(Boolean).slice(0, 3) : [];
  if (payoutWallet && !/^0x[a-fA-F0-9]{40}$/.test(payoutWallet)) {
    return jsonError(c, 422, "invalid_payout_wallet", "payoutWallet must be a valid EVM address (0x + 40 hex chars).");
  }
  if (!title || title.length > 100 || description.length < 40 || description.length > 1024) {
    return jsonError(c, 422, "invalid_listing", "Title is required and description must contain 40–1024 characters.");
  }
  if (!publisherName || publisherName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publisherEmail)) {
    return jsonError(c, 422, "invalid_publisher", "Publisher name and a valid contact email are required.");
  }
  if (!Boolean(input.rightsConfirmed)) {
    return jsonError(c, 422, "rights_not_confirmed", "Confirm that you have the right to publish this skill under MIT.");
  }
  if (githubUrl) {
    try {
      const parsed = new URL(githubUrl);
      if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") throw new Error();
    } catch {
      return jsonError(c, 422, "invalid_github_url", "GitHub URL must be an https://github.com link.");
    }
  }
  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM submissions WHERE publisher_email = ? AND created_at >= datetime('now', '-1 day')",
  ).bind(publisherEmail).first<{ count: number }>();
  if ((recent?.count || 0) >= 10) return jsonError(c, 429, "submission_limit", "This publisher has reached the daily submission limit.");
  const scan = scanSkill(skillMarkdown);
  if (!scan.safe || !scan.manifest) {
    return jsonError(c, 422, "prescan_failed", "The uploaded SKILL.md did not pass the required pre-scan.", scan);
  }
  const id = crypto.randomUUID();
  const reviewToken = randomToken("sub");
  const timestamp = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO submissions (
      id, slug, title, description, categories_json, usage_examples_json,
      publisher_name, publisher_email, github_url, skill_markdown, version,
      license, scan_result_json, risk_level, status, review_token_hash,
      payout_wallet, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reviewing', ?, ?, ?, ?)`,
  ).bind(
    id,
    scan.manifest.name,
    title,
    description,
    JSON.stringify(categories),
    JSON.stringify(usageExamples),
    publisherName,
    publisherEmail,
    githubUrl || null,
    skillMarkdown,
    scan.manifest.version,
    scan.manifest.license,
    JSON.stringify(scan),
    scan.riskLevel,
    await sha256(reviewToken),
    payoutWallet || null,
    timestamp,
    timestamp,
  ).run();
  return c.json({
    submission: { id, slug: scan.manifest.name, status: "reviewing", scan, createdAt: timestamp },
    statusToken: reviewToken,
    message: "Pre-scan passed. The skill is stored and awaiting manual review.",
  }, 201);
});

app.get("/api/v1/submissions/:id/status", async (c) => {
  const token = c.req.header("X-Submission-Token") || "";
  if (!token) return jsonError(c, 401, "submission_token_required", "Provide X-Submission-Token.");
  const row = await c.env.DB.prepare(
    "SELECT id, slug, title, status, risk_level, scan_result_json, created_at, updated_at, review_token_hash FROM submissions WHERE id = ?",
  ).bind(c.req.param("id")).first<Record<string, string>>();
  if (!row || row.review_token_hash !== await sha256(token)) {
    return jsonError(c, 404, "submission_not_found", "Submission or status token was not found.");
  }
  return c.json({ submission: { ...row, review_token_hash: undefined, scan: parseJson(row.scan_result_json, {}) } });
});

app.post("/api/v1/agents/access", async (c) => {
  const body = await readJsonBody(c, 20_000);
  if (!body || typeof body !== "object") return jsonError(c, 422, "invalid_agent", "Agent registration must be an object.");
  const input = body as Record<string, unknown>;
  const name = String(input.name || "").trim();
  const ownerEmail = String(input.ownerEmail || "").trim().toLowerCase();
  const purpose = String(input.purpose || "").trim();
  const dailyBudget = Math.min(100, Math.max(0.01, Number(input.dailyBudgetUsd || 1)));
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,63}$/.test(name)) {
    return jsonError(c, 422, "invalid_agent_name", "Agent name must contain 3–64 letters, numbers, hyphens, or underscores.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail) || purpose.length < 20 || purpose.length > 500) {
    return jsonError(c, 422, "invalid_agent_owner", "A valid owner email and a 20–500 character purpose are required.");
  }
  const recent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM agents WHERE owner_email = ? AND created_at >= datetime('now', '-1 day')",
  ).bind(ownerEmail).first<{ count: number }>();
  if ((recent?.count || 0) >= 5) return jsonError(c, 429, "agent_limit", "This owner has reached the daily agent-key limit.");
  const key = randomToken("gokui_live");
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  await c.env.DB.prepare(
    `INSERT INTO agents (id, name, owner_email, purpose, api_key_hash, api_key_prefix, daily_budget_usd, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
  ).bind(id, name, ownerEmail, purpose, await sha256(key), key.slice(0, 18), dailyBudget.toFixed(2), createdAt).run();
  const origin = new URL(c.req.url).origin;
  return c.json({
    agent: { id, name, dailyBudgetUsd: dailyBudget.toFixed(2), createdAt },
    apiKey: key,
    warning: "This key is shown once. Store it in a secret manager; never place it in prompts or client bundles.",
    endpoints: { search: `${origin}/api/v1/agent/skills`, recommend: `${origin}/api/v1/agent/recommend` },
  }, 201);
});

const requireAgent: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = c.req.header("Authorization") || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!key) return jsonError(c, 401, "agent_key_required", "Provide Authorization: Bearer <agent_api_key>.");
  const agent = await c.env.DB.prepare(
    "SELECT id, name, owner_email, purpose, daily_budget_usd FROM agents WHERE api_key_hash = ? AND status = 'active'",
  ).bind(await sha256(key)).first<AgentRecord>();
  if (!agent) return jsonError(c, 401, "invalid_agent_key", "The agent key is invalid or revoked.");
  c.set("agent", agent);
  await c.env.DB.prepare("UPDATE agents SET last_seen_at = ? WHERE id = ?").bind(nowIso(), agent.id).run();
  await next();
};

app.get("/api/v1/agent/skills", requireAgent, listSkills);

app.post("/api/v1/agent/recommend", requireAgent, async (c) => {
  const body = await readJsonBody(c, 20_000);
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const task = String(input.task || "").trim();
  const maxPrice = Number(input.maxPriceUsd || 0);
  if (task.length < 10 || task.length > 2000) return jsonError(c, 422, "invalid_task", "task must contain 10–2000 characters.");
  const tokens = [...new Set(task.toLowerCase().match(/[a-z0-9]{3,}|[\u4e00-\u9fff]{2,}/g) || [])];
  const rows = await c.env.DB.prepare(
    "SELECT * FROM skills WHERE status = 'approved' ORDER BY invokes DESC, updated_at DESC",
  ).all<SkillRecord>();
  const ranked = rows.results
    .filter((skill) => !maxPrice || Number(skill.price_usd) <= maxPrice)
    .map((skill) => {
      const haystack = `${skill.slug} ${skill.title} ${skill.description} ${skill.category} ${skill.tags_json}`.toLowerCase();
      const matched = tokens.filter((token) => haystack.includes(token));
      const score = matched.length * 20 + (skill.risk_level === "normal" ? 10 : 0) + Math.min(10, skill.invokes);
      return { skill, matched, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const origin = new URL(c.req.url).origin;
  return c.json({
    task,
    recommendations: ranked.map(({ skill, matched, score }, index) => ({
      rank: index + 1,
      score,
      reason: matched.length
        ? `Matched task terms: ${matched.slice(0, 5).join(", ")}.`
        : "Fallback candidate ranked by approved status, risk result, and current catalog coverage.",
      skill: publicSkill(skill, origin),
    })),
    rankingDisclosure: "Ranking uses task-term overlap, approved status, risk result, price filter, and settled invocation count.",
  });
});

app.post(
  "/api/v1/skills/:slug/invoke",
  requireAgent,
  async (c, next) => {
    const key = (c.req.header("Idempotency-Key") || "").trim();
    if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) {
      return jsonError(c, 400, "idempotency_key_required", "Provide an 8–128 character Idempotency-Key.");
    }
    const skill = await c.env.DB.prepare(
      "SELECT * FROM skills WHERE slug = ? AND status = 'approved'",
    ).bind(c.req.param("slug")).first<SkillRecord>();
    if (!skill) return jsonError(c, 404, "skill_not_found", "No approved skill uses that slug.");
    if (skill.delivery_type && skill.delivery_type !== "paid_api") {
      return jsonError(c, 409, "source_only_skill", "This community-curated listing is installed from its pinned upstream source; it is not a paid GOKUI endpoint.", {
        sourceUrl: skill.source_url,
        sourceCommit: skill.source_commit,
      });
    }
    c.set("skill", skill);
    const existing = await c.env.DB.prepare(
      "SELECT skill_id, request_hash, output_json, status, tx_hash, amount_usd, network FROM invocations WHERE agent_id = ? AND idempotency_key = ?",
    ).bind(c.get("agent").id, key).first<Record<string, string>>();
    if (existing && existing.skill_id !== skill.id) {
      return jsonError(c, 409, "idempotency_key_reused", "This idempotency key already belongs to a different skill invocation.");
    }
    if (existing?.status === "settled") {
      c.header("X-Idempotent-Replay", "true");
      return c.json({
        replay: true,
        result: parseJson(existing.output_json, {}),
        payment: { status: existing.status, txHash: existing.tx_hash, amountUsd: existing.amount_usd, network: existing.network },
      });
    }
    if (existing) return jsonError(c, 409, "invocation_in_progress", "This idempotency key already belongs to an unfinished invocation.");
    const spent = await c.env.DB.prepare(
      "SELECT COALESCE(SUM(CAST(amount_usd AS REAL)), 0) AS total FROM invocations WHERE agent_id = ? AND status = 'settled' AND created_at >= datetime('now', 'start of day')",
    ).bind(c.get("agent").id).first<{ total: number }>();
    if (Number(spent?.total || 0) + Number(c.env.X402_PRICE_USD) > Number(c.get("agent").daily_budget_usd)) {
      return jsonError(c, 403, "daily_budget_exceeded", "This invocation would exceed the agent's server-side daily budget.", {
        dailyBudgetUsd: c.get("agent").daily_budget_usd,
        spentTodayUsd: Number(spent?.total || 0).toFixed(2),
        requestedUsd: c.env.X402_PRICE_USD,
      });
    }
    await next();
  },
  x402Gate,
  async (c) => {
    const skill = c.get("skill");
    const body = await readJsonBody(c, 25_000);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError(c, 422, "invalid_skill_input", "Skill input must be a JSON object.");
    }
    const input = body as Record<string, unknown>;
    const result = executeSkill(skill, input);
    if (!result.ok) return jsonError(c, 422, "skill_input_rejected", String(result.error || "Skill rejected the input."));
    const requestHash = await sha256(JSON.stringify(input));
    const invocationId = crypto.randomUUID();
    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          `INSERT INTO invocations (
            id, skill_id, agent_id, idempotency_key, request_hash, payment_signature_hash,
            tx_hash, network, amount_usd, status, input_json, output_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 'executed', ?, ?, ?)`,
        ).bind(
          invocationId,
          skill.id,
          c.get("agent").id,
          c.req.header("Idempotency-Key"),
          requestHash,
          await paymentSignatureHash(c),
          c.env.X402_NETWORK,
          c.env.X402_PRICE_USD,
          JSON.stringify(input),
          JSON.stringify(result),
          nowIso(),
        ),
        c.env.DB.prepare("UPDATE skills SET invokes = invokes + 1, updated_at = ? WHERE id = ?").bind(nowIso(), skill.id),
      ]);
    } catch (error) {
      if (String(error).includes("UNIQUE")) return jsonError(c, 409, "duplicate_invocation", "Another request used this idempotency key.");
      throw error;
    }
    c.set("invocationId", invocationId);
    return c.json({
      invocationId,
      skill: { slug: skill.slug, version: skill.version },
      result,
      payment: { status: "settlement_pending", amountUsd: c.env.X402_PRICE_USD, network: c.env.X402_NETWORK },
    });
  },
);

function adminAuthorized(c: AppContext) {
  return Boolean(c.env.ADMIN_API_KEY) && c.req.header("X-Admin-Key") === c.env.ADMIN_API_KEY;
}

app.get("/api/v1/admin/submissions", async (c) => {
  if (!adminAuthorized(c)) return jsonError(c, 403, "admin_required", "A valid X-Admin-Key is required.");
  const rows = await c.env.DB.prepare(
    "SELECT id, slug, title, description, categories_json, publisher_name, publisher_email, github_url, version, risk_level, status, scan_result_json, created_at FROM submissions ORDER BY created_at DESC LIMIT 100",
  ).all<Record<string, string>>();
  return c.json({ submissions: rows.results.map((row) => ({ ...row, scan: parseJson(row.scan_result_json, {}) })) });
});

app.post("/api/v1/admin/submissions/:id/approve", async (c) => {
  if (!adminAuthorized(c)) return jsonError(c, 403, "admin_required", "A valid X-Admin-Key is required.");
  const submission = await c.env.DB.prepare("SELECT * FROM submissions WHERE id = ?").bind(c.req.param("id")).first<Record<string, string>>();
  if (!submission) return jsonError(c, 404, "submission_not_found", "No submission uses that id.");
  if (submission.status !== "reviewing") return jsonError(c, 409, "submission_not_reviewing", "Only reviewing submissions can be approved.");
  const timestamp = nowIso();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO skills (
          id, slug, title, description, category, tags_json, version, license,
          publisher_name, publisher_email, skill_markdown, runner, price_usd, risk_level,
          risk_summary, payout_wallet, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, ?, 'instructions', ?, ?, ?, ?, 'approved', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        submission.slug,
        submission.title,
        submission.description,
        parseJson<string[]>(submission.categories_json, ["Community"])[0] || "Community",
        submission.version,
        submission.license,
        submission.publisher_name,
        submission.publisher_email || null,
        submission.skill_markdown,
        c.env.X402_PRICE_USD,
        submission.risk_level,
        "Automated pre-scan passed and a marketplace reviewer approved the listing. Approval is not an endorsement; review permissions before use.",
        submission.payout_wallet || null,
        timestamp,
        timestamp,
      ),
      c.env.DB.prepare("UPDATE submissions SET status = 'approved', updated_at = ? WHERE id = ?").bind(timestamp, submission.id),
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE")) return jsonError(c, 409, "skill_slug_exists", "An approved skill already uses this slug.");
    throw error;
  }
  return c.json({ submission: { id: submission.id, status: "approved", slug: submission.slug }, approvedAt: timestamp });
});

app.post("/api/v1/admin/submissions/:id/reject", async (c) => {
  if (!adminAuthorized(c)) return jsonError(c, 403, "admin_required", "A valid X-Admin-Key is required.");
  const body = await readJsonBody(c, 5_000);
  const reason = body && typeof body === "object" ? String((body as Record<string, unknown>).reason || "").trim() : "";
  if (reason.length < 10) return jsonError(c, 422, "rejection_reason_required", "Provide a review reason of at least 10 characters.");
  const result = await c.env.DB.prepare(
    "UPDATE submissions SET status = 'rejected', scan_result_json = json_set(scan_result_json, '$.reviewReason', ?), updated_at = ? WHERE id = ? AND status = 'reviewing'",
  ).bind(reason, nowIso(), c.req.param("id")).run();
  if (!result.meta.changes) return jsonError(c, 404, "submission_not_found", "No reviewing submission uses that id.");
  return c.json({ submission: { id: c.req.param("id"), status: "rejected", reason } });
});

// ─────────────────────────────────────────────────────────────
// Freelancer registry + agent task-matching + secure offer flow
//
// State machine:
//   matching → offered → accepted → delivered → payment_pending → paid
//   Failure states: email_failed, payment_failed, expired, cancelled
//
// Security model:
//   - A cryptographically random task token is generated at match time.
//     Only its SHA-256 hash is stored. The raw token travels once, inside
//     the offer email. It is required for accept and deliver.
//   - GET offer page is read-only (link scanners cannot accept a task).
//   - Task tokens are never logged (the offer route bypasses the logger).
//   - "offered" is set only after Resend accepts the message.
//   - "paid" is set only after a confirmed transaction hash.
// ─────────────────────────────────────────────────────────────

type FreelancerRecord = {
  id: string; name: string; email: string; bio: string;
  skills_json: string; hourly_rate_usd: string | null;
  availability: string; verified: number;
  email_consent: number; payout_wallet: string | null;
  created_at: string; updated_at: string;
};

type TaskRequestRecord = {
  id: string; agent_id: string | null; title: string; description: string;
  required_skills_json: string; budget_usd: string | null;
  status: string; matched_freelancer_id: string | null;
  offer_expires_at: string | null; submission_url: string | null;
  submission_note: string | null;
  action_token_hash: string | null; idempotency_key: string | null;
  accepted_at: string | null; delivered_at: string | null; paid_at: string | null;
  payment_tx_hash: string | null; payment_error: string | null;
  created_at: string; updated_at: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

async function loadTaskWithFreelancer(c: AppContext, id: string) {
  return c.env.DB.prepare(
    `SELECT tr.*, f.email AS freelancer_email, f.name AS freelancer_name, f.payout_wallet AS freelancer_payout_wallet
       FROM task_requests tr JOIN freelancers f ON f.id = tr.matched_freelancer_id
      WHERE tr.id = ?`,
  ).bind(id).first<TaskRequestRecord & { freelancer_email: string; freelancer_name: string; freelancer_payout_wallet: string | null }>();
}

/** Validates the task action token. Returns null when valid, or an error response. */
async function checkTaskToken(c: AppContext, task: TaskRequestRecord, provided: string | undefined | null) {
  const token = (provided || "").trim();
  if (!token) return jsonError(c, 403, "token_required", "A task token is required.");
  if (!task.action_token_hash) {
    return jsonError(c, 410, "offer_reissue_required", "This offer link was invalidated. Ask an admin to resend a secure offer email.");
  }
  if (await sha256(token) !== task.action_token_hash) {
    return jsonError(c, 403, "invalid_token", "The task token is invalid.");
  }
  return null;
}

function offerExpired(task: TaskRequestRecord): boolean {
  return Boolean(task.offer_expires_at) && new Date(task.offer_expires_at as string) < new Date();
}

async function markExpired(c: AppContext, task: TaskRequestRecord) {
  await c.env.DB.prepare(
    "UPDATE task_requests SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'offered'",
  ).bind(nowIso(), task.id).run();
}

// Register as a freelancer / skill builder
app.post("/api/v1/freelancers/register", async (c) => {
  const body = await readJsonBody(c, 10_000);
  if (!body || typeof body !== "object") return jsonError(c, 422, "invalid_body", "Body must be JSON object.");
  const input = body as Record<string, unknown>;
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const bio = String(input.bio || "").trim();
  const skills = Array.isArray(input.skills) ? input.skills.map(String).map((s) => s.trim().toLowerCase()).filter(Boolean).slice(0, 20) : [];
  const hourlyRate = input.hourlyRateUsd === null || input.hourlyRateUsd === undefined || String(input.hourlyRateUsd).trim() === ""
    ? null
    : String(Number(input.hourlyRateUsd).toFixed(2));
  const payoutWallet = String(input.payoutWallet || "").trim();
  // Consent must be an explicit boolean true — anything else stores false.
  const emailConsent = input.emailConsent === true ? 1 : 0;
  if (!name || name.length > 100) return jsonError(c, 422, "invalid_name", "Name is required and must be under 100 characters.");
  if (!EMAIL_RE.test(email)) return jsonError(c, 422, "invalid_email", "A valid email is required.");
  if (bio.length < 20 || bio.length > 1000) return jsonError(c, 422, "invalid_bio", "Bio must be 20–1000 characters.");
  if (skills.length === 0) return jsonError(c, 422, "skills_required", "Provide at least one skill keyword.");
  if (hourlyRate !== null && (!Number.isFinite(Number(hourlyRate)) || Number(hourlyRate) < 0 || Number(hourlyRate) > 10_000)) {
    return jsonError(c, 422, "invalid_hourly_rate", "hourlyRateUsd must be between 0 and 10000.");
  }
  if (payoutWallet && !WALLET_RE.test(payoutWallet)) {
    return jsonError(c, 422, "invalid_payout_wallet", "payoutWallet must be a valid EVM address (0x + 40 hex chars).");
  }
  const id = crypto.randomUUID();
  const now = nowIso();
  try {
    await c.env.DB.prepare(
      `INSERT INTO freelancers (id, name, email, bio, skills_json, hourly_rate_usd, availability, email_consent, payout_wallet, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?)`,
    ).bind(id, name, email, bio, JSON.stringify(skills), hourlyRate, emailConsent, payoutWallet || null, now, now).run();
  } catch (err) {
    if (String(err).includes("UNIQUE")) return jsonError(c, 409, "email_taken", "This email is already registered.");
    throw err;
  }
  return c.json({
    freelancer: { id, name, email, skills, emailConsent: Boolean(emailConsent), createdAt: now },
    message: emailConsent
      ? "Registered. You will receive task offer emails when matched."
      : "Registered without email consent. You will not be matched to tasks until you opt in to offer emails.",
  }, 201);
});

// Admin: verify a freelancer (required before they can be matched)
app.post("/api/v1/admin/freelancers/:id/verify", async (c) => {
  if (!adminAuthorized(c)) return jsonError(c, 403, "admin_required", "A valid X-Admin-Key is required.");
  const result = await c.env.DB.prepare(
    "UPDATE freelancers SET verified = 1, updated_at = ? WHERE id = ?",
  ).bind(nowIso(), c.req.param("id")).run();
  if (!result.meta.changes) return jsonError(c, 404, "freelancer_not_found", "No freelancer uses that id.");
  return c.json({ freelancer: { id: c.req.param("id"), verified: true } });
});

// Agent: no suitable marketplace skill → platform matches the best eligible
// freelancer and sends a token-secured offer email.
app.post("/api/v1/tasks/match", requireAgent, async (c) => {
  const body = await readJsonBody(c, 10_000);
  if (!body || typeof body !== "object") return jsonError(c, 422, "invalid_body", "Body must be JSON object.");
  const input = body as Record<string, unknown>;
  const title = String(input.title || "").trim();
  const description = String(input.description || "").trim();
  const requiredSkills = Array.isArray(input.requiredSkills) ? input.requiredSkills.map(String).map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
  const budgetUsd = input.budgetUsd === null || input.budgetUsd === undefined || String(input.budgetUsd).trim() === ""
    ? null
    : String(Number(input.budgetUsd).toFixed(2));
  if (!title || title.length > 200) return jsonError(c, 422, "invalid_title", "Title required, max 200 chars.");
  if (description.length < 30 || description.length > 2000) return jsonError(c, 422, "invalid_description", "Description must be 30–2000 chars.");
  if (budgetUsd !== null && (!Number.isFinite(Number(budgetUsd)) || Number(budgetUsd) <= 0 || Number(budgetUsd) > 10_000)) {
    return jsonError(c, 422, "invalid_budget", "budgetUsd must be between 0 and 10000.");
  }

  // Replay-safe task creation for agents.
  const idemKey = (c.req.header("Idempotency-Key") || "").trim() || null;
  if (idemKey) {
    const existing = await c.env.DB.prepare(
      "SELECT id, status, offer_expires_at FROM task_requests WHERE agent_id = ? AND idempotency_key = ?",
    ).bind(c.get("agent").id, idemKey).first<{ id: string; status: string; offer_expires_at: string }>();
    if (existing) {
      c.header("X-Idempotent-Replay", "true");
      return c.json({ taskId: existing.id, status: existing.status, offerExpiresAt: existing.offer_expires_at, replay: true });
    }
  }

  // Eligibility: available + verified + explicit email consent + valid email.
  const allFreelancers = await c.env.DB.prepare(
    "SELECT * FROM freelancers WHERE availability = 'available' AND verified = 1 AND email_consent = 1 ORDER BY created_at",
  ).all<FreelancerRecord>();
  const tokens = [...new Set([...requiredSkills, ...title.toLowerCase().match(/[a-z0-9]{3,}/g) || []])];
  const ranked = allFreelancers.results
    .filter((f) => EMAIL_RE.test(f.email))
    .map((f) => {
      const fSkills = parseJson<string[]>(f.skills_json, []);
      const matched = tokens.filter((t) => fSkills.some((s) => s.includes(t) || t.includes(s)));
      return { freelancer: f, score: matched.length };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) {
    return jsonError(c, 404, "no_match", "No available verified freelancers matched the required skills.", { requiredSkills });
  }
  const best = ranked[0].freelancer;
  const taskId = crypto.randomUUID();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  // Secure action token: raw value goes only into the offer email; DB stores the hash.
  const actionToken = randomToken("task");
  const actionTokenHash = await sha256(actionToken);
  try {
    await c.env.DB.prepare(
      `INSERT INTO task_requests
         (id, agent_id, title, description, required_skills_json, budget_usd,
          status, matched_freelancer_id, offer_expires_at, action_token_hash, idempotency_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'matching', ?, ?, ?, ?, ?, ?)`,
    ).bind(taskId, c.get("agent").id, title, description, JSON.stringify(requiredSkills), budgetUsd, best.id, expiresAt, actionTokenHash, idemKey, now, now).run();
  } catch (err) {
    if (String(err).includes("UNIQUE")) return jsonError(c, 409, "duplicate_task", "Another request used this idempotency key.");
    throw err;
  }

  // Send the offer email synchronously: the task is only 'offered' if the
  // provider accepted the message; otherwise it is 'email_failed'.
  const origin = new URL(c.req.url).origin;
  const emailResult = await sendOfferEmail(c.env, {
    to: best.email,
    taskId,
    taskTitle: title,
    description,
    budgetUsd,
    origin,
    token: actionToken,
    idempotencyKey: `offer:${taskId}:1`,
  });
  await c.env.DB.prepare(
    `INSERT INTO email_log (id, task_request_id, recipient_email, template, status, provider_id, created_at)
     VALUES (?, ?, ?, 'offer', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), taskId, best.email, emailResult.ok ? "sent" : "failed", emailResult.id, nowIso()).run();
  const newStatus = emailResult.ok ? "offered" : "email_failed";
  await c.env.DB.prepare("UPDATE task_requests SET status = ?, updated_at = ? WHERE id = ?").bind(newStatus, nowIso(), taskId).run();

  if (!emailResult.ok) {
    return jsonError(c, 502, "offer_email_failed", "The offer email could not be sent. The task is stored and the email can be retried.", { taskId, status: "email_failed" });
  }
  return c.json({
    taskId,
    status: "offered",
    matchedFreelancer: { name: best.name, skills: parseJson<string[]>(best.skills_json, []) },
    offerExpiresAt: expiresAt,
    message: `Offer email sent to ${best.name}. Awaiting acceptance.`,
  }, 201);
});

// Admin: retry a failed offer email. Rotates the token (only the hash was
// stored) and uses a fresh provider idempotency key per attempt.
app.post("/api/v1/admin/tasks/:id/retry-email", async (c) => {
  if (!adminAuthorized(c)) return jsonError(c, 403, "admin_required", "A valid X-Admin-Key is required.");
  const task = await loadTaskWithFreelancer(c, c.req.param("id"));
  if (!task) return jsonError(c, 404, "task_not_found", "Task not found.");
  const legacyMissingHash = !task.action_token_hash;
  const legacyRetryable = legacyMissingHash && task.status === "offered";
  if (task.status !== "email_failed" && !legacyRetryable) {
    return jsonError(c, 409, "wrong_status", `Only 'email_failed' tasks can retry the offer email (or legacy 'offered' tasks missing a token hash); current: '${task.status}'.`);
  }
  const sent = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM email_log WHERE task_request_id = ? AND template = 'offer' AND status = 'sent'",
  ).bind(task.id).first<{ count: number }>();
  if (!legacyMissingHash && (sent?.count || 0) > 0) {
    return jsonError(c, 409, "already_sent", "An offer email was already sent for this task.");
  }
  const attempts = await c.env.DB.prepare(
    "SELECT COUNT(*) AS count FROM email_log WHERE task_request_id = ? AND template = 'offer'",
  ).bind(task.id).first<{ count: number }>();
  const attempt = (attempts?.count || 0) + 1;
  if (legacyMissingHash) {
    await c.env.DB.prepare(
      "UPDATE email_log SET status = 'superseded' WHERE task_request_id = ? AND template = 'offer' AND status = 'sent'",
    ).bind(task.id).run();
  }
  const actionToken = randomToken("task");
  await c.env.DB.prepare("UPDATE task_requests SET action_token_hash = ?, updated_at = ? WHERE id = ?")
    .bind(await sha256(actionToken), nowIso(), task.id).run();
  const origin = new URL(c.req.url).origin;
  const emailResult = await sendOfferEmail(c.env, {
    to: task.freelancer_email,
    taskId: task.id,
    taskTitle: task.title,
    description: task.description,
    budgetUsd: task.budget_usd,
    origin,
    token: actionToken,
    idempotencyKey: `offer:${task.id}:${attempt}`,
  });
  await c.env.DB.prepare(
    `INSERT INTO email_log (id, task_request_id, recipient_email, template, status, provider_id, created_at)
     VALUES (?, ?, ?, 'offer', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), task.id, task.freelancer_email, emailResult.ok ? "sent" : "failed", emailResult.id, nowIso()).run();
  const newStatus = emailResult.ok ? "offered" : "email_failed";
  await c.env.DB.prepare("UPDATE task_requests SET status = ?, updated_at = ? WHERE id = ?").bind(newStatus, nowIso(), task.id).run();
  if (!emailResult.ok) return jsonError(c, 502, "offer_email_failed", "The retry failed. The task remains 'email_failed'.", { taskId: task.id });
  return c.json({ taskId: task.id, status: "offered", attempt });
});

// Freelancer: read-only offer review page (linked from the email).
// Never changes state — link scanners cannot accept a task via GET.
app.get("/api/v1/tasks/:id/offer", async (c) => {
  const task = await loadTaskWithFreelancer(c, c.req.param("id"));
  if (!task) return jsonError(c, 404, "task_not_found", "Task not found.");
  const tokenErr = await checkTaskToken(c, task, c.req.query("token"));
  if (tokenErr) return tokenErr;
  if (task.status === "expired" || (task.status === "offered" && offerExpired(task))) {
    await markExpired(c, task);
    return jsonError(c, 410, "offer_expired", "This offer has expired.");
  }
  return c.json({
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      budgetUsd: task.budget_usd,
      requiredSkills: parseJson<string[]>(task.required_skills_json, []),
      status: task.status,
      offerExpiresAt: task.offer_expires_at,
    },
    readOnly: true,
    howToAccept: `POST /api/v1/tasks/${task.id}/accept with JSON body {"token": "<your token>"}.`,
  });
});

// Freelancer accepts a task offer — requires the task token.
app.post("/api/v1/tasks/:id/accept", async (c) => {
  const body = await readJsonBody(c, 5_000).catch(() => null);
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const task = await loadTaskWithFreelancer(c, c.req.param("id"));
  if (!task) return jsonError(c, 404, "task_not_found", "Task not found.");
  const tokenErr = await checkTaskToken(c, task, String(input.token ?? c.req.header("X-Task-Token") ?? ""));
  if (tokenErr) return tokenErr;
  if (task.status !== "offered") {
    if (task.status === "expired") return jsonError(c, 410, "offer_expired", "This offer has expired.");
    return jsonError(c, 409, "wrong_status", `Task is already '${task.status}'.`);
  }
  if (offerExpired(task)) {
    await markExpired(c, task);
    return jsonError(c, 410, "offer_expired", "This offer has expired.");
  }
  const result = await c.env.DB.prepare(
    "UPDATE task_requests SET status = 'accepted', accepted_at = ?, updated_at = ? WHERE id = ? AND status = 'offered'",
  ).bind(nowIso(), nowIso(), task.id).run();
  if (!result.meta.changes) return jsonError(c, 409, "wrong_status", "Task was already accepted.");
  return c.json({ taskId: task.id, status: "accepted", message: "Task accepted. Submit your work via POST /api/v1/tasks/:id/deliver with the same token." });
});

// Freelancer delivers work — requires the same task token.
app.post("/api/v1/tasks/:id/deliver", async (c) => {
  const body = await readJsonBody(c, 10_000);
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const task = await loadTaskWithFreelancer(c, c.req.param("id"));
  if (!task) return jsonError(c, 404, "task_not_found", "Task not found.");
  const tokenErr = await checkTaskToken(c, task, String(input.token ?? c.req.header("X-Task-Token") ?? ""));
  if (tokenErr) return tokenErr;
  const submissionUrl = String(input.submissionUrl || "").trim();
  const note = String(input.note || "").trim();
  if (!submissionUrl) return jsonError(c, 422, "url_required", "Provide submissionUrl with the deliverable link.");
  if (submissionUrl.length > 2048 || !isSafeHttpUrl(submissionUrl)) {
    return jsonError(c, 422, "invalid_url", "submissionUrl must be a valid http(s) URL under 2048 characters.");
  }
  if (note.length > 2000) return jsonError(c, 422, "note_too_long", "Delivery note must be at most 2000 characters.");
  if (task.status !== "accepted") {
    return jsonError(c, 409, "wrong_status", `Task must be 'accepted' to deliver; current: '${task.status}'.`);
  }
  const result = await c.env.DB.prepare(
    "UPDATE task_requests SET status = 'delivered', submission_url = ?, submission_note = ?, delivered_at = ?, updated_at = ? WHERE id = ? AND status = 'accepted'",
  ).bind(submissionUrl, note || null, nowIso(), nowIso(), task.id).run();
  if (!result.meta.changes) return jsonError(c, 409, "wrong_status", "Task was already delivered.");
  return c.json({ taskId: task.id, status: "delivered", message: "Delivery recorded. Awaiting admin approval and payment." });
});

// Admin approves delivery and triggers payment.
// State: delivered → payment_pending → paid (only with a confirmed tx hash)
//                                    ↘ payment_failed (safe to retry)
// Duplicate approval after success replays the stored result. Payment can
// never run twice: the durable payout row is the concurrency guard.
app.post("/api/v1/admin/tasks/:id/approve-and-pay", async (c) => {
  if (!adminAuthorized(c)) return jsonError(c, 403, "admin_required", "A valid X-Admin-Key is required.");
  const task = await loadTaskWithFreelancer(c, c.req.param("id"));
  if (!task) return jsonError(c, 404, "task_not_found", "Task not found.");

  // Replay-safe duplicate approval after success.
  if (task.status === "paid") {
    return c.json({ taskId: task.id, status: "paid", amountUsd: task.budget_usd, txHash: task.payment_tx_hash, replay: true });
  }
  if (task.status === "payment_pending") {
    return jsonError(c, 409, "payment_in_progress", "A payment attempt is already in progress for this task.");
  }
  if (task.status !== "delivered" && task.status !== "payment_failed") {
    return jsonError(c, 409, "wrong_status", "Task must be 'delivered' (or 'payment_failed' for a retry) to approve.");
  }

  const body = await readJsonBody(c, 2_000).catch(() => null);
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const payoutWallet = String(input.payoutWallet || "").trim() || task.freelancer_payout_wallet || "";
  if (!WALLET_RE.test(payoutWallet)) {
    return jsonError(c, 422, "payout_wallet_required", "Provide payoutWallet (EVM address), or register one on the freelancer profile.");
  }
  const amountUsd = task.budget_usd ?? "0.00";
  if (Number(amountUsd) <= 0) return jsonError(c, 422, "no_budget", "Task has no budget set. Cannot pay.");

  const now = nowIso();
  // Durable payout record — one per task.
  await c.env.DB.prepare(
    `INSERT OR IGNORE INTO task_payouts (id, task_request_id, recipient_wallet, amount_usd, network, status, attempts, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
  ).bind(crypto.randomUUID(), task.id, payoutWallet, amountUsd, c.env.X402_NETWORK, now, now).run();
  // Concurrency guard: claim the payout row; a parallel attempt gets 0 changes.
  const claim = await c.env.DB.prepare(
    `UPDATE task_payouts SET status = 'processing', attempts = attempts + 1, recipient_wallet = ?, updated_at = ?
      WHERE task_request_id = ? AND status IN ('pending', 'failed')`,
  ).bind(payoutWallet, nowIso(), task.id).run();
  if (!claim.meta.changes) {
    return jsonError(c, 409, "payment_in_progress", "A payment attempt is already in progress or settled for this task.");
  }
  await c.env.DB.prepare("UPDATE task_requests SET status = 'payment_pending', updated_at = ? WHERE id = ?").bind(nowIso(), task.id).run();

  const payResult = await sendUSDCPayment(c.env, payoutWallet, amountUsd);

  if (payResult.ok && payResult.txHash) {
    const paidAt = nowIso();
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE task_payouts SET status = 'settled', tx_hash = ?, error = NULL, updated_at = ? WHERE task_request_id = ?")
        .bind(payResult.txHash, paidAt, task.id),
      c.env.DB.prepare("UPDATE task_requests SET status = 'paid', paid_at = ?, payment_tx_hash = ?, payment_error = NULL, updated_at = ? WHERE id = ?")
        .bind(paidAt, payResult.txHash, paidAt, task.id),
    ]);
    // Confirmation email only after confirmed success; failure to email does
    // not affect the paid state.
    c.executionCtx.waitUntil(
      sendPaymentEmail(c.env, {
        to: task.freelancer_email,
        taskId: task.id,
        taskTitle: task.title,
        amountUsd,
        txHash: payResult.txHash,
      }).then(async (emailResult) => {
        await c.env.DB.prepare(
          `INSERT INTO email_log (id, task_request_id, recipient_email, template, status, provider_id, created_at)
           VALUES (?, ?, ?, 'payment_sent', ?, ?, ?)`,
        ).bind(crypto.randomUUID(), task.id, task.freelancer_email, emailResult.ok ? "sent" : "failed", emailResult.id, nowIso()).run();
      }),
    );
    return c.json({
      taskId: task.id,
      status: "paid",
      amountUsd,
      recipientWallet: payoutWallet,
      txHash: payResult.txHash,
      message: `Payment of $${amountUsd} USDC confirmed. Notification queued for ${task.freelancer_name}.`,
    });
  }

  // Failure: durable failed state, internal error detail only, safe retry later.
  const internalError = String(payResult.error || "payment provider error").slice(0, 300);
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE task_payouts SET status = 'failed', error = ?, updated_at = ? WHERE task_request_id = ?")
      .bind(internalError, nowIso(), task.id),
    c.env.DB.prepare("UPDATE task_requests SET status = 'payment_failed', payment_error = 'payment_provider_error', updated_at = ? WHERE id = ?")
      .bind(nowIso(), task.id),
  ]);
  return jsonError(c, 502, "payment_failed", "The payment could not be completed. The task is marked payment_failed and can be retried.", { taskId: task.id, status: "payment_failed" });
});

// Payout status — sellers can check their earnings
app.get("/api/v1/public/payouts", async (c) => {
  const wallet = (c.req.query("wallet") || "").trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(wallet)) {
    return jsonError(c, 422, "invalid_wallet", "Provide a valid EVM wallet address.");
  }
  const rows = await c.env.DB.prepare(
    `SELECT p.id, p.amount_usd, p.network, p.status, p.tx_hash, p.created_at, p.settled_at,
            s.slug AS skill_slug, s.title AS skill_title
       FROM payouts p
       JOIN skills s ON s.id = p.skill_id
      WHERE lower(p.recipient_wallet) = ?
      ORDER BY p.created_at DESC LIMIT 50`,
  ).bind(wallet).all<Record<string, unknown>>();
  return c.json({ wallet, payouts: rows.results });
});

app.notFound((c) => {
  if (new URL(c.req.url).pathname.startsWith("/api/") || new URL(c.req.url).pathname.startsWith("/.well-known/")) {
    return jsonError(c, 404, "route_not_found", "No marketplace API route matches this request.");
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
