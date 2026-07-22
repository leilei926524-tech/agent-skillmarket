/**
 * Focused integration tests for the SECURE human-freelancer fallback workflow.
 *
 * Everything runs locally:
 *  - D1 is emulated with an in-memory bun:sqlite database (all real migrations
 *    including 0006 are applied).
 *  - Resend is mocked by intercepting global fetch (no real emails).
 *  - USDC payment is mocked via mock.module (no real blockchain calls).
 *
 * State machine under test:
 *   matching → offered → accepted → delivered → payment_pending → paid
 *   Failure states: email_failed, payment_failed, expired
 */
import { describe, test, expect, beforeEach, afterAll, mock } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ── Payment mock (registered before importing the app) ──────────────────────
let paymentCalls: Array<{ wallet: string; amountUsd: string }> = [];
let paymentResult: { txHash: string | null; ok: boolean; error?: string } = {
  txHash: "0xmocked_tx_hash", ok: true,
};
mock.module("../src/payout.ts", () => ({
  sendUSDCPayment: async (_env: unknown, wallet: string, amountUsd: string) => {
    paymentCalls.push({ wallet, amountUsd });
    return paymentResult;
  },
  triggerSellerPayout: async () => {},
}));

const { default: app } = await import("../src/index");

// ── Minimal D1 shim over bun:sqlite ─────────────────────────────────────────
function makeD1(db: Database) {
  const stmt = (sql: string) => {
    let params: unknown[] = [];
    const api = {
      bind: (...args: unknown[]) => { params = args.map((v) => v === undefined ? null : v); return api; },
      first: async <T,>() => (db.prepare(sql).get(...(params as never[])) ?? null) as T | null,
      all: async <T,>() => ({ results: db.prepare(sql).all(...(params as never[])) as T[], success: true, meta: {} }),
      run: async () => {
        const info = db.prepare(sql).run(...(params as never[]));
        return { success: true, meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) } };
      },
    };
    return api;
  };
  return {
    prepare: stmt,
    batch: async (stmts: Array<ReturnType<typeof stmt>>) => {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    dump: async () => new ArrayBuffer(0),
    exec: async (sql: string) => { db.exec(sql); return { count: 0, duration: 0 }; },
  };
}

// ── Resend fetch mock ───────────────────────────────────────────────────────
type SentEmail = { url: string; headers: Record<string, string>; body: Record<string, unknown> };
let sentEmails: SentEmail[] = [];
let resendMode: "ok" | "fail" = "ok";
const realFetch = globalThis.fetch;
// @ts-expect-error test override
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.startsWith("https://api.resend.com/")) {
    const headers = Object.fromEntries(new Headers(init?.headers).entries());
    const body = JSON.parse(String(init?.body || "{}"));
    sentEmails.push({ url, headers, body });
    if (resendMode === "fail") {
      return new Response(JSON.stringify({ statusCode: 500, name: "internal_server_error", message: "provider secret detail SHOULD-NOT-LEAK" }), { status: 500 });
    }
    return new Response(JSON.stringify({ id: `re_mock_${sentEmails.length}` }), { status: 200 });
  }
  if (url.includes("base.org")) throw new Error(`Blocked outbound call in tests: ${url}`);
  return realFetch(input as never, init);
};
afterAll(() => {
  // @ts-expect-error restore overridden global for other test files
  globalThis.fetch = realFetch;
});

// ── Test env / helpers ──────────────────────────────────────────────────────
let sqlite: Database;
let env: Record<string, unknown>;
let bgTasks: Promise<unknown>[] = [];
const ctx = { waitUntil: (p: Promise<unknown>) => { bgTasks.push(p); }, passThroughOnException: () => {} };
const drainBg = async () => { await Promise.allSettled(bgTasks); bgTasks = []; };

const ADMIN_KEY = "test-admin-key-not-a-real-secret";
const WALLET = "0x00000000000000000000000000000000000000AA";

function freshEnv() {
  sqlite = new Database(":memory:");
  const dir = join(import.meta.dir, "..", "migrations");
  for (const f of readdirSync(dir).sort()) sqlite.exec(readFileSync(join(dir, f), "utf8"));
  env = {
    DB: makeD1(sqlite),
    ASSETS: { fetch: async () => new Response("web", { status: 200 }) },
    APP_ENV: "test",
    ADMIN_API_KEY: ADMIN_KEY,
    X402_NETWORK: "eip155:84532",
    X402_FACILITATOR_URL: "https://example.invalid",
    X402_PRICE_USD: "0.10",
    X402_PAY_TO: "0x0000000000000000000000000000000000000001",
    RESEND_API_KEY: "re_test_mock_key_never_real",
  };
}

const req = (path: string, init?: RequestInit) =>
  app.request(`https://gokui.test${path}`, init, env as never, ctx as never);

const json = (method: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
  req(path, { method, headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

const adminHdr = { "X-Admin-Key": ADMIN_KEY };

async function registerAgent(): Promise<string> {
  const r = await json("POST", "/api/v1/agents/access", {
    name: "test-agent", ownerEmail: "owner@example.com",
    purpose: "Integration testing of the freelancer fallback workflow.", dailyBudgetUsd: 5,
  });
  expect(r.status).toBe(201);
  return (await r.json()).apiKey as string;
}

async function registerFreelancer(over: Record<string, unknown> = {}) {
  return json("POST", "/api/v1/freelancers/register", {
    name: "Aiko Tanaka", email: over.email ?? "aiko@example.com",
    bio: "Experienced technical translator and copywriter for JP/EN.",
    skills: ["translation", "copywriting"], hourlyRateUsd: 40,
    payoutWallet: WALLET, emailConsent: true, ...over,
  });
}

async function verifyFreelancerViaApi(email: string) {
  const row = sqlite.prepare("SELECT id FROM freelancers WHERE email = ?").get(email) as { id: string };
  const res = await json("POST", `/api/v1/admin/freelancers/${row.id}/verify`, {}, adminHdr);
  expect(res.status).toBe(200);
}

async function matchTask(agentKey: string, over: Record<string, unknown> = {}, headers: Record<string, string> = {}) {
  return json("POST", "/api/v1/tasks/match", {
    title: "Translate onboarding guide", description: "Translate a 3-page onboarding guide from English to Japanese with technical accuracy.",
    requiredSkills: ["translation"], budgetUsd: 25, ...over,
  }, { Authorization: `Bearer ${agentKey}`, ...headers });
}

/** Extract the raw token from the review URL inside the last offer email. */
function tokenFromLastOfferEmail(): { taskId: string; token: string } {
  const html = String(sentEmails.at(-1)!.body.html);
  const m = html.match(/\/api\/v1\/tasks\/([a-f0-9-]+)\/offer\?token=([A-Za-z0-9_.%-]+)/);
  if (!m) throw new Error("No review link found in offer email");
  return { taskId: m[1], token: decodeURIComponent(m[2]) };
}

/** Full setup: eligible freelancer + matched task. Returns ids and token. */
async function setupOfferedTask() {
  const agentKey = await registerAgent();
  expect((await registerFreelancer()).status).toBe(201);
  await verifyFreelancerViaApi("aiko@example.com");
  const res = await matchTask(agentKey);
  expect(res.status).toBe(201);
  const { taskId } = await res.json();
  const { token } = tokenFromLastOfferEmail();
  return { agentKey, taskId, token };
}

const taskRow = (id: string) => sqlite.prepare("SELECT * FROM task_requests WHERE id = ?").get(id) as Record<string, unknown>;
const payoutRow = (id: string) => sqlite.prepare("SELECT * FROM task_payouts WHERE task_request_id = ?").get(id) as Record<string, unknown> | null;
const emailLogRows = (id: string) => sqlite.prepare("SELECT * FROM email_log WHERE task_request_id = ? ORDER BY created_at").all(id) as Record<string, unknown>[];

beforeEach(() => {
  freshEnv();
  sentEmails = [];
  resendMode = "ok";
  paymentCalls = [];
  paymentResult = { txHash: "0xmocked_tx_hash", ok: true };
  bgTasks = [];
});

// ════════════════════════════════════════════════════════════════════════════
describe("registration and consent", () => {
  test("valid registration succeeds and stores consent + payout wallet", async () => {
    const res = await registerFreelancer();
    expect(res.status).toBe(201);
    const row = sqlite.prepare("SELECT * FROM freelancers WHERE email = 'aiko@example.com'").get() as Record<string, unknown>;
    expect(row.email_consent).toBe(1);
    expect(row.payout_wallet).toBe(WALLET);
    expect(row.verified).toBe(0); // never auto-verified
  });

  test("invalid registrations are rejected", async () => {
    expect((await registerFreelancer({ email: "not-an-email" })).status).toBe(422);
    expect((await registerFreelancer({ bio: "too short" })).status).toBe(422);
    expect((await registerFreelancer({ skills: [] })).status).toBe(422);
    expect((await registerFreelancer({ payoutWallet: "not-a-wallet" })).status).toBe(422);
    expect((await registerFreelancer({ hourlyRateUsd: -5 })).status).toBe(422);
    await registerFreelancer();
    expect((await registerFreelancer()).status).toBe(409); // duplicate email
  });

  test("hourlyRateUsd supports explicit zero values", async () => {
    const res = await registerFreelancer({ email: "zero@example.com", hourlyRateUsd: 0 });
    expect(res.status).toBe(201);
    const row = sqlite.prepare("SELECT hourly_rate_usd FROM freelancers WHERE email = ?").get("zero@example.com") as { hourly_rate_usd: string | null };
    expect(row.hourly_rate_usd).toBe("0.00");
  });

  test("consent defaults to FALSE unless explicitly boolean true", async () => {
    await registerFreelancer({ email: "a@example.com", emailConsent: undefined });
    await registerFreelancer({ email: "b@example.com", emailConsent: "yes" }); // string is NOT consent
    const rows = sqlite.prepare("SELECT email, email_consent FROM freelancers").all() as { email: string; email_consent: number }[];
    for (const r of rows) expect(r.email_consent).toBe(0);
  });

  test("admin verification route: requires admin key, 404 for unknown id", async () => {
    await registerFreelancer();
    const { id } = sqlite.prepare("SELECT id FROM freelancers").get() as { id: string };
    expect((await json("POST", `/api/v1/admin/freelancers/${id}/verify`, {})).status).toBe(403);
    expect((await json("POST", `/api/v1/admin/freelancers/${id}/verify`, {}, { "X-Admin-Key": "wrong" })).status).toBe(403);
    expect((await json("POST", "/api/v1/admin/freelancers/unknown-id/verify", {}, adminHdr)).status).toBe(404);
    const ok = await json("POST", `/api/v1/admin/freelancers/${id}/verify`, {}, adminHdr);
    expect(ok.status).toBe(200);
    expect((sqlite.prepare("SELECT verified FROM freelancers WHERE id = ?").get(id) as { verified: number }).verified).toBe(1);
  });
});

describe("no-skill fallback and matching eligibility", () => {
  test("agent finds no marketplace skill, then falls back to a human", async () => {
    const agentKey = await registerAgent();
    // Step 1: marketplace recommend returns no suitable skill (empty catalog).
    const rec = await json("POST", "/api/v1/agent/recommend",
      { task: "Handwrite calligraphy scrolls with brush ink for a ceremonial banquet" }, { Authorization: `Bearer ${agentKey}` });
    expect(rec.status).toBe(200);
    // The catalog (seeded by migration 0003) has no skill for this task: no
    // recommendation matches any meaningful task term (only stopwords like
    // "with"/"for" can match), so the agent can determine that no suitable
    // marketplace skill exists and must fall back to a human.
    const recs = (await rec.json()).recommendations as Array<{ reason: string; score: number }>;
    for (const r of recs) {
      for (const term of ["calligraphy", "scrolls", "brush", "ink", "ceremonial", "banquet", "handwrite"]) {
        expect(r.reason.toLowerCase()).not.toContain(term);
      }
    }
    // Step 2: human fallback matches an eligible freelancer.
    await registerFreelancer();
    await verifyFreelancerViaApi("aiko@example.com");
    const res = await matchTask(agentKey);
    expect(res.status).toBe(201);
    expect((await res.json()).matchedFreelancer.name).toBe("Aiko Tanaka");
  });

  test("ineligible freelancers are excluded: no consent, unverified, offline", async () => {
    const agentKey = await registerAgent();
    // No consent (verified + available but consent false)
    await registerFreelancer({ email: "noconsent@example.com", emailConsent: false });
    await verifyFreelancerViaApi("noconsent@example.com");
    expect((await matchTask(agentKey)).status).toBe(404);
    // Consent but unverified
    await registerFreelancer({ email: "unverified@example.com" });
    expect((await matchTask(agentKey)).status).toBe(404);
    // Consent + verified but offline
    await registerFreelancer({ email: "offline@example.com" });
    await verifyFreelancerViaApi("offline@example.com");
    sqlite.exec("UPDATE freelancers SET availability = 'offline' WHERE email = 'offline@example.com'");
    expect((await matchTask(agentKey)).status).toBe(404);
    // Fully eligible → matched, and none of the ineligible ones were emailed
    await registerFreelancer({ email: "eligible@example.com" });
    await verifyFreelancerViaApi("eligible@example.com");
    const res = await matchTask(agentKey);
    expect(res.status).toBe(201);
    expect(sentEmails.length).toBe(1);
    expect(sentEmails[0].body.to).toEqual(["eligible@example.com"]);
  });

  test("budgetUsd zero is rejected as invalid_budget", async () => {
    const agentKey = await registerAgent();
    await registerFreelancer();
    await verifyFreelancerViaApi("aiko@example.com");
    const res = await matchTask(agentKey, { budgetUsd: 0 });
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("invalid_budget");
  });

  test("best-matching freelancer is selected", async () => {
    const agentKey = await registerAgent();
    await registerFreelancer();
    await verifyFreelancerViaApi("aiko@example.com");
    await registerFreelancer({ email: "poly@example.com", name: "Poly Glot", skills: ["translation", "onboarding", "guide"] });
    await verifyFreelancerViaApi("poly@example.com");
    const res = await matchTask(agentKey);
    expect((await res.json()).matchedFreelancer.name).toBe("Poly Glot");
  });

  test("agent idempotency: same Idempotency-Key replays the same task", async () => {
    const agentKey = await registerAgent();
    await registerFreelancer();
    await verifyFreelancerViaApi("aiko@example.com");
    const r1 = await matchTask(agentKey, {}, { "Idempotency-Key": "task-idem-1" });
    expect(r1.status).toBe(201);
    const { taskId } = await r1.json();
    const r2 = await matchTask(agentKey, {}, { "Idempotency-Key": "task-idem-1" });
    expect(r2.status).toBe(200);
    const body2 = await r2.json();
    expect(body2.replay).toBe(true);
    expect(body2.taskId).toBe(taskId);
    expect(sentEmails.length).toBe(1); // no second email
  });
});

describe("offer email safety", () => {
  test("recipient, contents, escaping, provider idempotency key, audit log", async () => {
    const agentKey = await registerAgent();
    await registerFreelancer();
    await verifyFreelancerViaApi("aiko@example.com");
    const res = await matchTask(agentKey, {
      title: "Translate <b>guide</b>",
      description: 'Includes <script>alert("x")</script> and needs care with a 30+ char description.',
    });
    expect(res.status).toBe(201);
    const { taskId } = await res.json();

    expect(sentEmails.length).toBe(1);
    const email = sentEmails[0];
    expect(email.body.to).toEqual(["aiko@example.com"]);
    expect(email.body.from).toBe("GOKUI Marketplace <noreply@gokui.mesalaunch.com>");
    expect(email.headers["idempotency-key"]).toBe(`offer:${taskId}:1`);
    const html = String(email.body.html);
    // user text is HTML-escaped
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Translate &lt;b&gt;guide&lt;/b&gt;");
    expect(html).toContain("$25.00");
    expect(html).toContain(`/api/v1/tasks/${taskId}/offer?token=`);
    // the raw token is never stored — only its hash
    const { token } = tokenFromLastOfferEmail();
    const row = taskRow(taskId);
    expect(row.action_token_hash).not.toBe(token);
    expect(String(row.action_token_hash)).toMatch(/^[a-f0-9]{64}$/);
    // audit log
    const logs = emailLogRows(taskId);
    expect(logs.length).toBe(1);
    expect(logs[0].status).toBe("sent");
  });

  test("RESEND_FROM_EMAIL override is honored", async () => {
    (env as Record<string, unknown>).RESEND_FROM_EMAIL = "XPRTOS <offers@xprtos.example>";
    const agentKey = await registerAgent();
    await registerFreelancer();
    await verifyFreelancerViaApi("aiko@example.com");
    await matchTask(agentKey);
    expect(sentEmails[0].body.from).toBe("XPRTOS <offers@xprtos.example>");
  });

  test("provider failure → task is email_failed (NOT offered), safe error, no leak", async () => {
    const agentKey = await registerAgent();
    await registerFreelancer();
    await verifyFreelancerViaApi("aiko@example.com");
    resendMode = "fail";
    const res = await matchTask(agentKey);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("offer_email_failed");
    expect(JSON.stringify(body)).not.toContain("SHOULD-NOT-LEAK");
    const taskId = body.error.details.taskId as string;
    expect(taskRow(taskId).status).toBe("email_failed");
    const logs = emailLogRows(taskId);
    expect(logs[0].status).toBe("failed");
    expect(JSON.stringify(logs)).not.toContain("SHOULD-NOT-LEAK");
  });

  test("email retry: works after failure, dedupes after success", async () => {
    const agentKey = await registerAgent();
    await registerFreelancer();
    await verifyFreelancerViaApi("aiko@example.com");
    resendMode = "fail";
    const fail = await matchTask(agentKey);
    const taskId = (await fail.json()).error.details.taskId as string;

    // retry requires admin
    expect((await json("POST", `/api/v1/admin/tasks/${taskId}/retry-email`, {})).status).toBe(403);
    // retry succeeds once the provider recovers
    resendMode = "ok";
    const retry = await json("POST", `/api/v1/admin/tasks/${taskId}/retry-email`, {}, adminHdr);
    expect(retry.status).toBe(200);
    expect(taskRow(taskId).status).toBe("offered");
    // fresh provider idempotency key per attempt
    expect(sentEmails.at(-1)!.headers["idempotency-key"]).toBe(`offer:${taskId}:2`);
    // second retry after success is refused → no duplicate email
    const dup = await json("POST", `/api/v1/admin/tasks/${taskId}/retry-email`, {}, adminHdr);
    expect(dup.status).toBe(409);
    expect(sentEmails.length).toBe(2); // 1 failed + 1 sent, nothing more
    // and the rotated token from the retry email works
    const { token } = tokenFromLastOfferEmail();
    expect((await json("POST", `/api/v1/tasks/${taskId}/accept`, { token })).status).toBe(200);
  });

  test("legacy offered task missing hash can be retried to reissue secure token", async () => {
    const { taskId, token: oldToken } = await setupOfferedTask();
    sqlite.exec(`UPDATE task_requests SET action_token_hash = NULL WHERE id = '${taskId}'`);
    const retry = await json("POST", `/api/v1/admin/tasks/${taskId}/retry-email`, {}, adminHdr);
    expect(retry.status).toBe(200);
    const row = taskRow(taskId);
    expect(String(row.action_token_hash)).toMatch(/^[a-f0-9]{64}$/);
    expect((await json("POST", `/api/v1/tasks/${taskId}/accept`, { token: oldToken })).status).toBe(403);
    const { token: newToken } = tokenFromLastOfferEmail();
    expect((await json("POST", `/api/v1/tasks/${taskId}/accept`, { token: newToken })).status).toBe(200);
  });
});

describe("offer review page and acceptance security", () => {
  test("GET offer page is read-only and token-gated", async () => {
    const { taskId, token } = await setupOfferedTask();
    // missing token → 403; invalid token → 403
    expect((await req(`/api/v1/tasks/${taskId}/offer`)).status).toBe(403);
    expect((await req(`/api/v1/tasks/${taskId}/offer?token=wrong`)).status).toBe(403);
    // valid token → read-only task summary, and state does NOT change
    const res = await req(`/api/v1/tasks/${taskId}/offer?token=${encodeURIComponent(token)}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.readOnly).toBe(true);
    expect(body.task.title).toBe("Translate onboarding guide");
    expect(taskRow(taskId).status).toBe("offered"); // link scanner cannot accept
    // opening it repeatedly (like a mail scanner) still changes nothing
    await req(`/api/v1/tasks/${taskId}/offer?token=${encodeURIComponent(token)}`);
    expect(taskRow(taskId).status).toBe("offered");
  });

  test("accept: missing token 403, invalid 403, valid 200, reuse 409", async () => {
    const { taskId, token } = await setupOfferedTask();
    expect((await json("POST", `/api/v1/tasks/${taskId}/accept`, {})).status).toBe(403);
    expect((await json("POST", `/api/v1/tasks/${taskId}/accept`, { token: "wrong" })).status).toBe(403);
    const ok = await json("POST", `/api/v1/tasks/${taskId}/accept`, { token });
    expect(ok.status).toBe(200);
    expect(taskRow(taskId).status).toBe("accepted");
    expect(taskRow(taskId).accepted_at).toBeTruthy();
    expect((await json("POST", `/api/v1/tasks/${taskId}/accept`, { token })).status).toBe(409);
  });

  test("expired offer: accept returns 410 and task becomes 'expired'", async () => {
    const { taskId, token } = await setupOfferedTask();
    sqlite.exec(`UPDATE task_requests SET offer_expires_at = '2020-01-01T00:00:00.000Z' WHERE id = '${taskId}'`);
    const res = await json("POST", `/api/v1/tasks/${taskId}/accept`, { token });
    expect(res.status).toBe(410);
    expect(taskRow(taskId).status).toBe("expired");
    // the offer page also reports 410 afterwards
    expect((await req(`/api/v1/tasks/${taskId}/offer?token=${encodeURIComponent(token)}`)).status).toBe(410);
  });

  test("legacy task without token hash returns 410 and requires secure reissue", async () => {
    const { taskId, token } = await setupOfferedTask();
    sqlite.exec(`UPDATE task_requests SET action_token_hash = NULL WHERE id = '${taskId}'`);
    const accept = await json("POST", `/api/v1/tasks/${taskId}/accept`, { token });
    expect(accept.status).toBe(410);
    expect((await accept.json()).error.code).toBe("offer_reissue_required");
  });
});

describe("delivery security", () => {
  test("delivery requires the token and an accepted task", async () => {
    const { taskId, token } = await setupOfferedTask();
    // before acceptance → 409 (with valid token)
    expect((await json("POST", `/api/v1/tasks/${taskId}/deliver`, { token, submissionUrl: "https://example.com/w" })).status).toBe(409);
    await json("POST", `/api/v1/tasks/${taskId}/accept`, { token });
    // no token / wrong token → 403 (someone else cannot deliver)
    expect((await json("POST", `/api/v1/tasks/${taskId}/deliver`, { submissionUrl: "https://example.com/w" })).status).toBe(403);
    expect((await json("POST", `/api/v1/tasks/${taskId}/deliver`, { token: "wrong", submissionUrl: "https://attacker.example/x" })).status).toBe(403);
    // valid delivery
    const ok = await json("POST", `/api/v1/tasks/${taskId}/deliver`, { token, submissionUrl: "https://example.com/work", note: "done" });
    expect(ok.status).toBe(200);
    expect(taskRow(taskId).status).toBe("delivered");
    expect(taskRow(taskId).delivered_at).toBeTruthy();
    // duplicate delivery → 409
    expect((await json("POST", `/api/v1/tasks/${taskId}/deliver`, { token, submissionUrl: "https://example.com/other" })).status).toBe(409);
  });

  test("unsafe submission URLs and oversized notes are rejected", async () => {
    const { taskId, token } = await setupOfferedTask();
    await json("POST", `/api/v1/tasks/${taskId}/accept`, { token });
    for (const bad of ["javascript:alert(1)", "file:///etc/passwd", "data:text/html,x", "ftp://example.com/x", "not a url", ""]) {
      const res = await json("POST", `/api/v1/tasks/${taskId}/deliver`, { token, submissionUrl: bad });
      expect(res.status).toBe(422);
    }
    const res = await json("POST", `/api/v1/tasks/${taskId}/deliver`, { token, submissionUrl: "https://example.com/w", note: "x".repeat(2001) });
    expect(res.status).toBe(422);
    expect(taskRow(taskId).status).toBe("accepted"); // nothing was recorded
  });

  test("legacy accepted task without token hash cannot be delivered", async () => {
    const { taskId, token } = await setupOfferedTask();
    sqlite.exec(`UPDATE task_requests SET status = 'accepted', action_token_hash = NULL WHERE id = '${taskId}'`);
    const deliver = await json("POST", `/api/v1/tasks/${taskId}/deliver`, { token, submissionUrl: "https://example.com/work" });
    expect(deliver.status).toBe(410);
    expect((await deliver.json()).error.code).toBe("offer_reissue_required");
  });
});

describe("payment safety", () => {
  async function deliveredTask() {
    const setup = await setupOfferedTask();
    await json("POST", `/api/v1/tasks/${setup.taskId}/accept`, { token: setup.token });
    await json("POST", `/api/v1/tasks/${setup.taskId}/deliver`, { token: setup.token, submissionUrl: "https://example.com/work" });
    return setup;
  }

  test("admin auth required; approval only after delivery; provider not called early", async () => {
    const { taskId, token } = await setupOfferedTask();
    expect((await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {})).status).toBe(403);
    expect((await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr)).status).toBe(409); // offered ≠ delivered
    await json("POST", `/api/v1/tasks/${taskId}/accept`, { token });
    expect((await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr)).status).toBe(409); // accepted ≠ delivered
    expect(paymentCalls.length).toBe(0);
  });

  test("success: payment_pending → paid with tx hash, durable payout row, email after success only", async () => {
    const { taskId } = await deliveredTask();
    const res = await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("paid");
    expect(body.txHash).toBe("0xmocked_tx_hash");
    // wallet came from the freelancer's registered payout wallet
    expect(paymentCalls).toEqual([{ wallet: WALLET, amountUsd: "25.00" }]);
    const row = taskRow(taskId);
    expect(row.status).toBe("paid");
    expect(row.payment_tx_hash).toBe("0xmocked_tx_hash");
    expect(row.paid_at).toBeTruthy();
    const payout = payoutRow(taskId)!;
    expect(payout.status).toBe("settled");
    expect(payout.tx_hash).toBe("0xmocked_tx_hash");
    expect(payout.attempts).toBe(1);
    await drainBg();
    const payEmail = sentEmails.at(-1)!;
    expect(payEmail.body.to).toEqual(["aiko@example.com"]);
    expect(String(payEmail.body.html)).toContain("0xmocked_tx_hash");
  });

  test("failure: payment_failed recorded, no success email, no secret leak, safe retry", async () => {
    const { taskId } = await deliveredTask();
    const emailsBefore = sentEmails.length;
    paymentResult = { txHash: null, ok: false, error: "rpc: PLATFORM key rejected SHOULD-NOT-LEAK" };
    const res = await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("payment_failed");
    expect(JSON.stringify(body)).not.toContain("SHOULD-NOT-LEAK");
    await drainBg();
    expect(sentEmails.length).toBe(emailsBefore); // NO payment-success email
    const row = taskRow(taskId);
    expect(row.status).toBe("payment_failed");
    expect(row.payment_error).toBe("payment_provider_error"); // generic, no provider detail
    const payout = payoutRow(taskId)!;
    expect(payout.status).toBe("failed");
    expect(payout.attempts).toBe(1);

    // retry succeeds and settles
    paymentResult = { txHash: "0xretry_tx_hash", ok: true };
    const retry = await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr);
    expect(retry.status).toBe(200);
    expect((await retry.json()).txHash).toBe("0xretry_tx_hash");
    expect(taskRow(taskId).status).toBe("paid");
    expect(taskRow(taskId).payment_tx_hash).toBe("0xretry_tx_hash");
    expect(payoutRow(taskId)!.attempts).toBe(2);
    expect(paymentCalls.length).toBe(2);
  });

  test("duplicate approval after success replays result; payment never runs twice", async () => {
    const { taskId } = await deliveredTask();
    await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr);
    const dup = await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr);
    expect(dup.status).toBe(200);
    const body = await dup.json();
    expect(body.replay).toBe(true);
    expect(body.txHash).toBe("0xmocked_tx_hash");
    expect(paymentCalls.length).toBe(1); // provider called exactly once
  });

  test("concurrent duplicate attempt is blocked by the payout claim guard", async () => {
    const { taskId } = await deliveredTask();
    // Simulate a competing in-flight attempt: payout row already 'processing'.
    const now = new Date().toISOString();
    sqlite.prepare(
      "INSERT INTO task_payouts (id, task_request_id, recipient_wallet, amount_usd, network, status, attempts, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'processing', 1, ?, ?)",
    ).run(crypto.randomUUID(), taskId, WALLET, "25.00", "eip155:84532", now, now);
    const res = await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr);
    expect(res.status).toBe(409);
    expect(paymentCalls.length).toBe(0);
    // and a task already in payment_pending is likewise refused
    sqlite.exec(`UPDATE task_requests SET status = 'payment_pending' WHERE id = '${taskId}'`);
    expect((await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr)).status).toBe(409);
  });

  test("missing budget or wallet is rejected before any payment attempt", async () => {
    const { taskId } = await deliveredTask();
    sqlite.exec("UPDATE freelancers SET payout_wallet = NULL");
    expect((await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, { payoutWallet: "bad" }, adminHdr)).status).toBe(422);
    expect((await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr)).status).toBe(422);
    sqlite.exec(`UPDATE task_requests SET budget_usd = NULL WHERE id = '${taskId}'`);
    expect((await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, { payoutWallet: WALLET }, adminHdr)).status).toBe(422);
    expect(paymentCalls.length).toBe(0);
  });
});

describe("full state machine", () => {
  test("end to end: matching → offered → accepted → delivered → payment_pending → paid", async () => {
    const observed: string[] = [];
    const { taskId, token } = await setupOfferedTask();
    observed.push(String(taskRow(taskId).status));            // offered
    await json("POST", `/api/v1/tasks/${taskId}/accept`, { token });
    observed.push(String(taskRow(taskId).status));            // accepted
    await json("POST", `/api/v1/tasks/${taskId}/deliver`, { token, submissionUrl: "https://example.com/work" });
    observed.push(String(taskRow(taskId).status));            // delivered
    const res = await json("POST", `/api/v1/admin/tasks/${taskId}/approve-and-pay`, {}, adminHdr);
    expect(res.status).toBe(200);
    observed.push(String(taskRow(taskId).status));            // paid
    expect(observed).toEqual(["offered", "accepted", "delivered", "paid"]);
    // every important state is timestamped for the demo audit trail
    const row = taskRow(taskId);
    expect(row.accepted_at && row.delivered_at && row.paid_at && row.payment_tx_hash).toBeTruthy();
    // and the audit tables tell the whole story
    expect(emailLogRows(taskId).map((r) => r.template)).toContain("offer");
    expect(payoutRow(taskId)!.status).toBe("settled");
  });
});
