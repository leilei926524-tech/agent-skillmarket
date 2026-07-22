# x402/Base payment verification — 2026-07-22

Verified by: Claude Code (with @leilei926524-tech), pre-merge check on `agent/yc-marketplace-mvp`.

## Why this test happened

A teammate's separate proof-of-work report claimed a live on-chain payment demo
(Ethereum Sepolia + a custom `SkillRegistry.sol` contract). That claim couldn't be
independently verified — the code it referenced doesn't exist in any repo we have
access to, and the report's transaction links weren't real URLs.

Separately, this repo already had a materially more complete implementation sitting
unmerged on `agent/yc-marketplace-mvp`: a full GOKUI marketplace (submissions,
review, agent auth, discovery) with real x402 payment on **Base**, deployed to
`gokui.mesalaunch.com`. Before deciding whether to merge that branch, we needed to
know: does the payment mechanism actually work, or is it UI/demo scaffolding like
the unverifiable Sepolia report?

## What we tested, and how to reproduce each part

### 1. Production is live and has already settled one real payment

```
curl https://gokui.mesalaunch.com/api/health
curl https://gokui.mesalaunch.com/api/v1/public/activity
```

Found one prior settled invocation. Independently verified the tx directly against
Base mainnet's public RPC (not the site's own claim):

```bash
curl -X POST https://mainnet.base.org -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionReceipt","params":["<tx_hash>"]}'
```

Confirmed: `status: 0x1`, USDC contract, exact amount, exact configured `X402_PAY_TO`
address. This was $0.01 in real USDC on Base mainnet — real money, not staged.

### 2. Full local sandbox on Base Sepolia (fake money, same code)

Ran the actual `worker/` code locally via `wrangler dev --local`, `.dev.vars`
pointed at Base Sepolia (`eip155:84532`) and the public x402 facilitator
(`https://x402.org/facilitator` — no CDP credentials needed for testnet), against
a local D1 database seeded by the existing migrations.

```bash
cd <repo root>
bun install && bun install --cwd web
bunx wrangler d1 migrations apply DB --local
bun run build:web
bunx wrangler dev --local --port 8787
```

`.dev.vars` (gitignored, not committed):
```
APP_ENV=development
X402_NETWORK=eip155:84532
X402_FACILITATOR_URL=https://x402.org/facilitator
X402_PRICE_USD=0.01
X402_PAY_TO=<any test address you control>
ADMIN_API_KEY=<any local-only value>
```

Ran the repo's own `examples/x402-buyer.ts` against `http://127.0.0.1:8787` using a
disposable Base Sepolia wallet funded from Circle's public faucet
(`faucet.circle.com`, no login required). Result: `HTTP 200`, real settled tx.

**Verified independently against two unrelated RPC providers**
(`sepolia.base.org` and `base-sepolia-rpc.publicnode.com` — different operators,
same chain id `0x14a34` = 84532), both returning an identical, matching receipt.
Buyer wallet balance dropped by exactly the invoiced amount each time, confirmed
via direct `balanceOf` calls, not the site's own numbers.

**Gotcha:** the buyer wallet never needs ETH. x402's `exact` EVM scheme uses
EIP-3009 `transferWithAuthorization` — the buyer only signs an off-chain
authorization; the facilitator's relayer wallet broadcasts and pays gas. Don't
waste time funding a buyer wallet with testnet ETH before trying this.

**Gotcha:** BaseScan failed to index some of these Sepolia transactions and
addresses at all (`"Transaction Hash not found"`), even 20+ minutes and 600+
confirmations later, while two independent RPC nodes agreed on the exact same
receipt. **Blockscout (`base-sepolia.blockscout.com`) indexed everything
correctly and decoded the contract call (`FiatTokenV2_2.transferWithAuthorization`
— Circle's real USDC implementation).** If BaseScan looks empty on Sepolia, check
Blockscout before concluding a payment didn't happen.

**Gotcha:** `bun run build:web` and `wrangler dev --local` both need real memory
headroom — Next.js/Turbopack's build alone can spike to 2-4GB, and workerd + local
D1 + wrangler want another 1-2GB on top. Under ~3GB free we got hard OOM kills
(`JavaScript heap out of memory`, then a Go-runtime `cannot allocate memory`) at
two different stages. Free up to ~5GB before attempting this.

### 3. Autonomous agent flow — search, decide, invoke, pay, without a human naming the skill

Built `mcp/gokui-skills/` (a small reusable MCP server, not a one-off script) and a
paired Claude Code skill at `.claude/skills/gokui-skills/SKILL.md`. Given a task
description, an agent calls `search_gokui_skills` to check whether a marketplace
skill already covers it, decides whether to use the top match, and if so calls
`invoke_gokui_skill`, which pays via x402 automatically and returns both the
skill's result and the on-chain payment proof.

Ran this against the local Sepolia sandbox above with a real task ("should we
approve a 28%/24-month/prepaid B2B SaaS discount request") and no skill slug given
up front. The agent found `deal-desk-discount-guardrails` on its own (top-ranked
match), invoked it, paid, and used the real returned decision (`APPROVE_WITH_CONDITIONS`
first run, `COUNTER` on a second run with different numbers — genuinely computed
per input, not a canned response). Re-ran the identical flow from a second,
independently-registered agent key to confirm it isn't a one-off fluke — same
result shape, a third real settled tx.

See `mcp/gokui-skills/README.md` for full setup (three env vars, one `claude mcp
add` command). This is task-agnostic on purpose — the skill file contains no fixed
question, only one clearly-labeled example, so each person testing it supplies
their own task.

## For teammates reproducing this on their own machine

1. `git fetch origin feature/agent-mcp-tools && git checkout feature/agent-mcp-tools`
2. Follow "2." above to get your own local Sepolia sandbox running — every person
   should use their own disposable Sepolia wallet from the Circle faucet, not share
   one.
3. Follow `mcp/gokui-skills/README.md` to register the MCP server / skill against
   your own local instance.
4. Give your agent any real task and see whether it decides on its own to search
   the marketplace and use a skill — don't hand it the skill slug.

This intentionally does not depend on a shared server: each person's test is
independent and produces its own verifiable tx hashes, which is more convincing
than everyone pointing at one machine.

## Open questions this raised for the team (not resolved here)

- **No per-skill/per-seller payout wallet yet** — every paid skill currently pays
  into one hardcoded platform `X402_PAY_TO`; there's no DB column or code path for
  "pay the actual skill author." Needed before third-party sellers can really list
  paid skills. See discussion in this thread for a rough effort estimate
  (per-skill payout: ~1-2 days; real revenue split: 3-7 days and meaningfully
  higher risk, since it needs either custodial payout accounting or a new
  on-chain splitter contract).
- **Submitters can't set their own price** — `POST /api/v1/submissions` has no
  price field; price is fixed platform-wide by `X402_PRICE_USD` at approval time.
- **The `invoke` response's `payment.status` field is always `"settlement_pending"`**
  regardless of actual outcome (a real display bug in `worker/src/index.ts` /
  `payment.ts` — the JSON body is built before the async settlement check runs).
  The true result is only in the `PAYMENT-RESPONSE` header and the DB row, not the
  response body clients would naively read.
- **`agent/yc-marketplace-mvp` is still unmerged** (15 commits ahead of `main`,
  all real product work: submission review, agent auth/budget, 60-language i18n,
  curated catalog, and this payment mechanism) — this test only speaks to whether
  the payment mechanism itself is real, not whether the branch is ready to merge
  as a whole.
