# ExpertOS — agent-skillmarket

ExpertOS is a working marketplace path for agent skills:

1. Publishers submit a standard `SKILL.md` through a format and security pre-scan.
2. Approved skills are stored in Cloudflare D1 and exposed through human and machine-readable discovery.
3. Agents register for a revocable API key, search or rank skills for a task, and invoke paid endpoints.
4. Paid endpoints implement the x402 v2 `402 → PAYMENT-SIGNATURE → retry → PAYMENT-RESPONSE` flow.

The frontend is a static Next.js 16 export served by the same Cloudflare Worker that owns the API and D1 database. Live mode never falls back to fabricated browser state.

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
- `X402_PRICE_USD`: fixed beta invocation price, at least `$0.001`
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

## Trust boundary

Automated scanning and manual beta review reduce risk; neither is an endorsement or safety guarantee. Third-party skills remain untrusted content. Agents must review permissions, use least privilege, protect secrets, enforce spend limits, and require confirmation for consequential writes.
