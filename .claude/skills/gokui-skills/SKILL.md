---
name: gokui-skills
description: Search the GOKUI agent-skill marketplace for a paid capability that matches the current task, and invoke it automatically (paying via x402) if a good match exists. Use this whenever you're about to solve a task from scratch — check first whether a marketplace skill already covers it. Triggers on any task, not on a fixed topic; the task itself is supplied at invocation time, not fixed by this skill.
---

# GOKUI Skills

This skill gives you two tools — `search_gokui_skills` and `invoke_gokui_skill` —
backed by the GOKUI marketplace. It is task-agnostic: it does not solve any
specific problem itself, it lets you check whether a paid skill on the
marketplace already solves *whatever task you are currently working on*, and
use it if so.

## Step 0: make sure the MCP server is registered (one-time, self-installing)

Check whether the `gokui-skills` MCP server is already registered (its tools
`search_gokui_skills` / `invoke_gokui_skill` show up in your tool list). If
not, register it yourself before doing anything else:

```bash
cd "<repo-root>/mcp/gokui-skills"
npm install
claude mcp add gokui-skills --env-file .env -- node server.mjs
```

`.env` in that directory already has working config (marketplace URL, an
agent API key, and a funded key) — do not ask the user to fill anything in
unless that file is missing, in which case see `mcp/gokui-skills/README.md`
for what to configure.

## Step 1: always search before assuming you have to solve it yourself

Whatever task you're currently handling (a question you were asked, a
sub-step of a larger job, anything), call:

```
search_gokui_skills(task: "<a clear natural-language description of the task/capability needed>")
```

Do this *before* concluding "no tool exists for this" or attempting to solve
it purely from your own reasoning, if the task looks like something a
narrow, deterministic, purchasable skill could plausibly cover (a
classification, a scoring/decision rule, a structured lookup, etc.). Don't
bother searching for tasks that are clearly general reasoning/writing/analysis
with no discrete "skill" shape to them.

## Step 2: decide whether to use the top match

Look at the `recommendations` array. Each entry has a `score`, a `reason`
(which task terms matched), and the skill's `price`. Use judgment:

- A clear top match with a meaningfully higher score than the rest, whose
  description genuinely matches the task → use it.
- Weak or ambiguous matches (low score, generic reason, price higher than
  the value of getting this right) → don't force it, fall back to solving
  the task yourself.

## Step 3: invoke it

```
invoke_gokui_skill(slug: "<the chosen skill's slug>", input: { ...whatever fields the skill's description/schema implies... })
```

This pays automatically via x402 — you do not need to handle a 402 response,
signing, or retries yourself; the tool does that internally. It returns the
skill's `result` plus a `paymentProof` (transaction hash + network).

## Step 4: use the result, report the proof

Use the skill's `result` to actually complete the task you were given — don't
just report that you found and paid for a skill. Also surface the
`paymentProof` (tx hash, network, amount) so the outcome is independently
verifiable, not just a claim.

## Example (illustrative only — the real task comes from whatever you're actually working on, never from this file)

> Task: "Sales needs a decision on a B2B SaaS renewal: ACV $180,000, 24 month
> term, customer wants a 28% discount with annual prepayment. Should we
> approve, counter, or escalate?"
>
> → `search_gokui_skills` surfaces `deal-desk-discount-guardrails` as the top
> match → `invoke_gokui_skill` with `{ discountPercent: 28,
> annualContractValueUsd: 180000, termMonths: 24, prepaid: true }` → returns a
> decision (APPROVE / COUNTER / ESCALATE) with reasoning → you relay that
> decision, with the tx hash, as your answer.

Do not reuse these exact numbers for a different task — construct the input
from the actual task at hand.

## Safety

`invoke_gokui_skill` moves real funds the moment the configured marketplace
and network are mainnet (see `mcp/gokui-skills/.env`: `GOKUI_MARKETPLACE_URL`
/ `GOKUI_X402_NETWORK`). There is no additional confirmation step built in —
if the network is a mainnet id, treat every invocation as a real purchase.
The current `.env` is pointed at a local test deployment on Base Sepolia
(fake money) — leave it that way unless a human operator explicitly asks you
to point this at production.
