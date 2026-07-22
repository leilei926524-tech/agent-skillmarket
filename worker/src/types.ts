import type { MiddlewareHandler } from "hono";

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV: string;
  ADMIN_API_KEY?: string;
  CDP_API_KEY_ID?: string;
  CDP_API_KEY_SECRET?: string;
  X402_NETWORK: `eip155:${string}`;
  X402_FACILITATOR_URL: string;
  X402_PRICE_USD: string;
  X402_PAY_TO: `0x${string}`;
  // Seller payout: platform signs USDC transfers to skill publishers (85/15 split)
  PLATFORM_PRIVATE_KEY?: `0x${string}`;
  SELLER_REVENUE_SHARE_BPS?: string; // basis points, default 8500 (85%)
  RESEND_API_KEY?: string;           // for Task 5 email feature
};

export type AgentRecord = {
  id: string;
  name: string;
  owner_email: string;
  purpose: string;
  daily_budget_usd: string;
};

export type SkillRecord = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  tags_json: string;
  version: string;
  license: string;
  publisher_name: string;
  skill_markdown: string;
  runner: string;
  price_usd: string;
  risk_level: string;
  risk_summary: string;
  status: string;
  invokes: number;
  created_at: string;
  updated_at: string;
  delivery_type?: "paid_api" | "external_source";
  listing_kind?: "platform" | "publisher" | "curated";
  publisher_verified?: number;
  source_url?: string | null;
  source_commit?: string | null;
  source_path?: string | null;
  payout_wallet?: string | null;
  publisher_email?: string | null;
};

export type Variables = {
  agent: AgentRecord;
  skill: SkillRecord;
  invocationId?: string;
};

export type AppMiddleware = MiddlewareHandler<{ Bindings: Env; Variables: Variables }>;
