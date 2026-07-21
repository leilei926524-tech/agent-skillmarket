import { Hono, type Context, type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AgentRecord, Env, SkillRecord, Variables } from "./types";
import { BodyError, jsonError, nowIso, parseJson, publicSkill, randomToken, readJsonBody, sha256 } from "./utils";
import { scanSkill } from "./scan";
import { executeSkill } from "./execution";
import { paymentSignatureHash, x402Gate } from "./payment";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();
type AppEnv = { Bindings: Env; Variables: Variables };
type AppContext = Context<AppEnv, string>;

app.use("/api/*", logger());
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
  const categories = Array.isArray(input.categories) ? input.categories.map(String).map((v) => v.trim()).filter(Boolean).slice(0, 3) : [];
  const usageExamples = Array.isArray(input.usageExamples) ? input.usageExamples.map(String).map((v) => v.trim()).filter(Boolean).slice(0, 3) : [];
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
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reviewing', ?, ?, ?)`,
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
          publisher_name, skill_markdown, runner, price_usd, risk_level,
          risk_summary, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, 'instructions', ?, ?, ?, 'approved', ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        submission.slug,
        submission.title,
        submission.description,
        parseJson<string[]>(submission.categories_json, ["Community"])[0] || "Community",
        submission.version,
        submission.license,
        submission.publisher_name,
        submission.skill_markdown,
        c.env.X402_PRICE_USD,
        submission.risk_level,
        "Automated pre-scan passed and a marketplace reviewer approved the listing. Approval is not an endorsement; review permissions before use.",
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

app.notFound((c) => {
  if (new URL(c.req.url).pathname.startsWith("/api/") || new URL(c.req.url).pathname.startsWith("/.well-known/")) {
    return jsonError(c, 404, "route_not_found", "No marketplace API route matches this request.");
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
