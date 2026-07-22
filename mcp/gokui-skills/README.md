# gokui-skills MCP server

Gives an agent two tools so it can discover and use paid GOKUI marketplace skills
on its own, instead of a human telling it which skill to call:

- `search_gokui_skills(task, maxPriceUsd?)` — ranks marketplace skills against a
  natural-language task description. Call this before assuming a task needs to be
  solved from scratch.
- `invoke_gokui_skill(slug, input)` — invokes a skill by slug and pays for it
  automatically via the x402 protocol. Returns the skill's result plus an
  on-chain payment proof (transaction hash, network).

Payment happens inside `invoke_gokui_skill` itself: the tool wraps `fetch` with
`@x402/fetch`'s payment handler, so a 402 response is paid and retried
transparently. The agent never sees or manages the 402/pay/retry mechanics.

## Setup

```bash
cd mcp/gokui-skills
npm install
cp .env.example .env   # fill in the values below, .env is gitignored
```

You need:

1. **`GOKUI_MARKETPLACE_URL`** — which deployment to talk to. Defaults to the
   local dev worker (`http://127.0.0.1:8787`, see the repo root README for how to
   run it). Point this at `https://gokui.mesalaunch.com` only once you intend the
   next step to spend real money.
2. **`GOKUI_AGENT_API_KEY`** — register one:
   ```bash
   curl -X POST "$GOKUI_MARKETPLACE_URL/api/v1/agents/access" \
     -H "Content-Type: application/json" \
     -d '{"name":"my-agent","ownerEmail":"you@example.com","purpose":"...","dailyBudgetUsd":1}'
   ```
   The response's `apiKey` is shown once — save it. `dailyBudgetUsd` is a
   server-side spend cap enforced per agent key.
3. **`GOKUI_EVM_PRIVATE_KEY`** — the wallet that pays. On testnet this can be a
   disposable key with faucet funds. **On mainnet this is a real credential that
   controls real money — see the warning below.**
4. **`GOKUI_X402_NETWORK`** — `eip155:84532` (Base Sepolia, fake money) or
   `eip155:8453` (Base mainnet, real money).

## Registering with an agent

Claude Code:

```bash
claude mcp add gokui-skills --env-file mcp/gokui-skills/.env -- node mcp/gokui-skills/server.mjs
```

or add directly to `.mcp.json`:

```json
{
  "mcpServers": {
    "gokui-skills": {
      "command": "node",
      "args": ["mcp/gokui-skills/server.mjs"],
      "env": {
        "GOKUI_MARKETPLACE_URL": "http://127.0.0.1:8787",
        "GOKUI_AGENT_API_KEY": "...",
        "GOKUI_EVM_PRIVATE_KEY": "...",
        "GOKUI_X402_NETWORK": "eip155:84532"
      }
    }
  }
}
```

Any other MCP-compatible client works the same way — it's a standard stdio MCP
server, nothing Claude-Code-specific about it.

## Testing before you trust it

Run against a local or testnet marketplace first (`GOKUI_X402_NETWORK=eip155:84532`
against `http://127.0.0.1:8787` or a Sepolia-configured deployment). Confirm the
skill it picks and the amount it pays are what you expect before ever pointing
`GOKUI_MARKETPLACE_URL` / `GOKUI_X402_NETWORK` at production.

## ⚠️ Mainnet warning

`invoke_gokui_skill` moves real funds the moment `GOKUI_X402_NETWORK` is a
mainnet id and `GOKUI_MARKETPLACE_URL` points at a production deployment. There
is no additional confirmation step — the agent that holds this MCP server's
tools can spend up to `dailyBudgetUsd` per registered agent key, autonomously,
every time it decides a task needs a paid skill. Before wiring this to
production:

- Fund the signing wallet with only what you're comfortable an agent spending
  unsupervised.
- Keep `GOKUI_EVM_PRIVATE_KEY` in a secret manager / injected env var, never in
  source control, prompts, or logs.
- Treat `dailyBudgetUsd` on the agent key as your actual safety limit and size
  it deliberately.
