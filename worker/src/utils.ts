import type { Context } from "hono";
import type { Env, Variables } from "./types";

export const nowIso = () => new Date().toISOString();

export function jsonError(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503,
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

export function publicSkill(skill: import("./types").SkillRecord, origin: string) {
  const publisher = skill.publisher_name === "ExpertOS Labs" ? "GOKUI Labs" : skill.publisher_name;
  return {
    id: skill.id,
    slug: skill.slug,
    title: skill.title,
    description: skill.description,
    category: skill.category,
    tags: parseJson<string[]>(skill.tags_json, []),
    version: skill.version,
    license: skill.license,
    publisher,
    price: { amount: skill.price_usd, currency: "USDC", network: "Base" },
    risk: { level: skill.risk_level, summary: skill.risk_summary },
    invokes: skill.invokes,
    invokeUrl: `${origin}/api/v1/skills/${skill.slug}/invoke`,
    updatedAt: skill.updated_at,
  };
}
