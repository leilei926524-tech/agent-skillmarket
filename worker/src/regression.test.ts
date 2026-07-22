import { describe, expect, test } from "bun:test";
import { executeSkill } from "./execution";
import { matchesSkillQuery, rankSkillsForTask } from "./search";
import type { SkillRecord } from "./types";
import { publicSkill } from "./utils";
import { INVOCATION_RESULT_RETENTION_MS, invocationResultExpired, invocationResultExpiresAt } from "./retention";
import { scanSkill } from "./scan";

function skill(overrides: Partial<SkillRecord> = {}): SkillRecord {
  return {
    id: "skill-test",
    slug: "customer-research",
    title: "Customer Research",
    description: "Turn interviews into evidence-backed customer insights.",
    category: "Research",
    tags_json: '["interviews","voice-of-customer"]',
    version: "1.0.0",
    license: "MIT",
    publisher_name: "Test Publisher",
    skill_markdown: "# Test",
    runner: "instructions",
    price_usd: "0.00",
    risk_level: "normal",
    risk_summary: "Review sources and protect customer data.",
    status: "approved",
    invokes: 0,
    created_at: "2026-07-22T00:00:00.000Z",
    updated_at: "2026-07-22T00:00:00.000Z",
    delivery_type: "external_source",
    listing_kind: "curated",
    publisher_verified: 0,
    source_url: "https://github.com/example/repo/tree/0123456789012345678901234567890123456789/skill",
    source_commit: "0123456789012345678901234567890123456789",
    source_path: "skill",
    search_aliases_json: '["用户研究","为什么不购买","customer interviews"]',
    localizations_json: '{"zh-CN":{"title":"客户研究","description":"分析访谈和评论中的真实购买原因。","category":"研究"}}',
    ...overrides,
  };
}

describe("catalog search", () => {
  test("matches a Chinese task alias", () => {
    expect(matchesSkillQuery(skill(), "研究用户为什么不购买")).toBe(true);
  });

  test("returns no fallback for an unrelated stopword-only task", () => {
    expect(rankSkillsForTask([skill()], "and the user should use this task")).toEqual([]);
  });

  test("ranks the relevant alias without catalog padding", () => {
    const unrelated = skill({ id: "skill-unrelated", slug: "invoice-check", title: "Invoice Check", search_aliases_json: '["发票","invoice"]' });
    const ranked = rankSkillsForTask([unrelated, skill()], "我想研究用户为什么不购买");
    expect(ranked.map((item) => item.skill.slug)).toEqual(["customer-research"]);
  });
});

describe("paid input and delivery boundaries", () => {
  const paid = skill({
    id: "skill-paid",
    slug: "deal-desk-discount-guardrails",
    title: "Deal Desk Discount Guardrails",
    runner: "deal_desk",
    price_usd: "0.01",
    delivery_type: "paid_api",
    listing_kind: "platform",
  });

  test("rejects coerced deal-desk fields before payment", () => {
    expect(executeSkill(paid, { discountPercent: "25", annualContractValueUsd: 100000, termMonths: 24, prepaid: true }).ok).toBe(false);
  });

  test("accepts the documented deal-desk input", () => {
    expect(executeSkill(paid, { discountPercent: 10, annualContractValueUsd: 100000, termMonths: 24, prepaid: true })).toMatchObject({ ok: true, decision: "APPROVE" });
  });

  test("fails an unknown delivery type closed to source-only", () => {
    const exposed = publicSkill(skill({ delivery_type: undefined }), "https://api.example.com");
    expect(exposed.delivery).toEqual({ type: "external_source", callable: false });
    expect(exposed.invokeUrl).toBeNull();
  });
});

describe("invocation result retention", () => {
  test("expires a paid result exactly 24 hours after creation", () => {
    const createdAt = "2026-07-22T00:00:00.000Z";
    const expiresAt = invocationResultExpiresAt(createdAt);
    expect(expiresAt).toBe("2026-07-23T00:00:00.000Z");
    expect(invocationResultExpired(expiresAt, Date.parse(createdAt) + INVOCATION_RESULT_RETENTION_MS - 1)).toBe(false);
    expect(invocationResultExpired(expiresAt, Date.parse(createdAt) + INVOCATION_RESULT_RETENTION_MS)).toBe(true);
  });

  test("does not treat a legacy missing expiry as expired", () => {
    expect(invocationResultExpired(null, Date.now())).toBe(false);
  });
});

describe("submission safety scan", () => {
  const header = `---\nname: safe-write-skill\ndescription: "Prepare a customer message from the supplied facts and return a clear delivery record."\nlicense: MIT\nmetadata:\n  version: "1.0.0"\n---\n`;

  test("does not flag an external action when explicit confirmation is required", () => {
    const scan = scanSkill(`${header}\nDraft the message. Never send or publish without confirmation.`);
    expect(scan.safe).toBe(true);
    expect(scan.warnings).not.toContain("May perform an external write or financial action; add explicit confirmation rules.");
  });

  test("flags an external action without a confirmation rule", () => {
    const scan = scanSkill(`${header}\nDraft and send the message to the customer.`);
    expect(scan.warnings).toContain("May perform an external write or financial action; add explicit confirmation rules.");
  });
});
