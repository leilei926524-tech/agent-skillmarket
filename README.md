# GOKUI — agent-skillmarket

GOKUI is a working marketplace path for agent skills. The name comes from the
Japanese word `極意` — the essence or innermost know-how of a craft:

1. Publishers submit a standard `SKILL.md` through a format and security pre-scan.
2. Approved skills are stored in Cloudflare D1 and exposed through human and machine-readable discovery.
3. Agents register for a revocable API key, search or rank skills for a task, and invoke paid endpoints.
4. Paid endpoints implement the x402 v2 `402 → PAYMENT-SIGNATURE → retry → PAYMENT-RESPONSE` flow.

The frontend is a static Next.js 16 export served by the same Cloudflare Worker that owns the API and D1 database. Production pages read from the Worker API and D1.

## Internationalization

The interface ships as 60 static language packs: English plus the 59 languages in OpenAI's current [ChatGPT interface language list](https://help.openai.com/en/articles/8357869-how-to-change-your-language-setting-in-chatgpt). The site detects the browser preference on first visit, stores an explicit selection on the device, and supports right-to-left layout for Arabic, Persian, and Urdu. Skill listings, submitted Markdown, API payloads, and agent-generated results remain in their publisher-provided language so technical content is not silently altered.

## Local development

```bash
bun install
bun install --cwd web
bun run build:web
bun run db:local
bun run dev
```

Wrangler serves the static site and API together. The exact local URL is printed by `wrangler dev`.

## Required deployment configuration

- D1 binding: `DB`
- `X402_NETWORK`: `eip155:84532` for Base Sepolia or `eip155:8453` for Base mainnet
- `X402_FACILITATOR_URL`: public testnet facilitator for Base Sepolia; authenticated CDP facilitator for mainnet
- `X402_PAY_TO`: team-controlled EVM receiving address
- `X402_PRICE_USD`: fixed invocation price, at least `$0.001`
- `ADMIN_API_KEY`: Wrangler secret for manual submission review

Never commit wallet keys, CDP credentials, agent API keys, or the admin key.
The public receiving address is intentionally deployment configuration; signing keys never belong in this repository.

## Core endpoints

- `POST /api/v1/submissions`
- `GET /api/v1/submissions/:id/status`
- `POST /api/v1/agents/access`
- `GET /api/v1/agent/skills`
- `POST /api/v1/agent/recommend`
- `POST /api/v1/skills/:slug/invoke`
- `GET /.well-known/agent-skills.json`

## Production buyer example

`examples/x402-buyer.ts` is a strict, policy-bounded x402 client. It refuses a payment unless the origin, network, USDC contract, receiving address, and maximum atomic amount all match the configured expectations.

```bash
MARKETPLACE_URL="https://your-worker.workers.dev" \
AGENT_API_KEY="$GOKUI_API_KEY" \
EVM_PRIVATE_KEY="$BUYER_PRIVATE_KEY" \
EXPECTED_PAY_TO="0xYourTeamWallet" \
X402_NETWORK="eip155:8453" \
MAX_ATOMIC_USDC="10000" \
bun run buyer:invoke
```

Use `SKILL_INPUT_JSON` to override the valid Deal Desk request used by default. Keep buyer keys in a secret manager, never in shell history, prompts, or the repository.

## Trust boundary

Automated scanning and manual marketplace review reduce risk; neither is an endorsement or safety guarantee. Third-party skills remain untrusted content. Agents must review permissions, use least privilege, protect secrets, enforce spend limits, and require confirmation for consequential writes.
