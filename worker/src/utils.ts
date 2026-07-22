import type { Context } from "hono";
import type { Env, Variables } from "./types";
import { skillInputContract } from "./execution";

export const nowIso = () => new Date().toISOString();

export function jsonError(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  status: 400 | 401 | 403 | 404 | 409 | 410 | 413 | 422 | 429 | 500 | 503,
  code: string,
  message: string,
  details?: unknown,
) {
  return c.json({ error: { code, message, ...(details ? { details } : {}) } }, status);
}

export function randomToken(prefix: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const value = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  return `${prefix}_${value}`;
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function readJsonBody(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  maxBytes = 220_000,
) {
  const declared = Number(c.req.header("content-length") || "0");
  if (declared > maxBytes) throw new BodyError(413, "payload_too_large", `Request body exceeds ${maxBytes} bytes.`);
  const text = await c.req.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new BodyError(413, "payload_too_large", `Request body exceeds ${maxBytes} bytes.`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BodyError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

export class BodyError extends Error {
  constructor(
    public status: 400 | 413 | 422,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

function withPublicBrand(value: string) {
  return value.replaceAll("GOKUI Labs", "ExpertOS Labs").replaceAll("GOKUI", "ExpertOS");
}

export function publicSkill(skill: import("./types").SkillRecord, origin: string) {
  const publisher = withPublicBrand(skill.publisher_name);
  const deliveryType = skill.delivery_type === "paid_api" ? "paid_api" : "external_source";
  const listingKind = skill.listing_kind || (["GOKUI Labs", "ExpertOS Labs"].includes(skill.publisher_name) ? "platform" : "publisher");
  const invokeUrl = deliveryType === "paid_api" ? `${origin}/api/v1/skills/${skill.slug}/invoke` : null;
  const input = deliveryType === "paid_api" ? skillInputContract(skill) : null;
  const localizations = parseJson<Record<string, { title?: string; description?: string; category?: string; riskSummary?: string }>>(
    skill.localizations_json || "{}",
    {},
  );
  for (const localization of Object.values(localizations)) {
    for (const key of ["title", "description", "category", "riskSummary"] as const) {
      if (localization[key]) localization[key] = withPublicBrand(localization[key]);
    }
  }
  return {
    id: skill.id,
    slug: skill.slug,
    title: withPublicBrand(skill.title),
    description: withPublicBrand(skill.description),
    category: skill.category,
    tags: parseJson<string[]>(skill.tags_json, []),
    searchAliases: parseJson<string[]>(skill.search_aliases_json || "[]", []),
    localizations,
    version: skill.version,
    license: skill.license,
    publisher,
    price: { amount: skill.price_usd, currency: "USDC", network: "Base" },
    risk: { level: skill.risk_level, summary: withPublicBrand(skill.risk_summary) },
    invokes: skill.invokes,
    invokeUrl,
    inputSchema: input?.schema || null,
    exampleInput: input?.example || null,
    delivery: {
      type: deliveryType,
      callable: deliveryType === "paid_api",
    },
    provenance: {
      listingKind,
      curatedBy: listingKind === "curated" ? "ExpertOS" : null,
      publisherVerified: Boolean(skill.publisher_verified),
      source: skill.source_url
        ? {
            url: skill.source_url,
            commit: skill.source_commit || null,
            path: skill.source_path || null,
          }
        : null,
    },
    updatedAt: skill.updated_at,
  };
}
