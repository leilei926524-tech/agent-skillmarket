# Frontend ⇄ Backend integration contract

The UI (`web/`) is **stage-safe by design**: it runs entirely on an internal
demo driver (keyboard keys below) with zero backend dependency — venue wifi
dying cannot kill the demo. Wiring the real pipeline in is optional polish,
to be attempted **only after the core pipeline is done** (koki's 15:30 rule).

## Demo driver (works today, no backend)

| Key | Beat |
|-----|------|
| `1` | Buyer agent invokes the hero skill → pays ¥120 → guardrail answer types out → wallet +¥102 → audit row |
| `2` | (press repeatedly) Human-fallback pipeline: gap → matched → offer email → accepted → delivered |
| `3` | Completed task minted as new encrypted skill (取適法 card appears, NEW badge) |
| `P` | Toggle ambient market activity |
| `R` | Reset all state |

State persists in `localStorage` and syncs across tabs via
`BroadcastChannel("expertos-demo")` — you can put the Store and the Wallet
side-by-side in two windows and beats animate in both.

## Data shapes (source of truth: `web/lib/demo.tsx`)

```ts
Skill    { id, name, expert, verified, priceJpy, rating, calls, category, blurb, minted?, isNew? }
AuditRow { id, ts, kind: "invoke"|"mint", agent, skillName, gross, net, tx }
```

## If wiring the real pipeline (Yudai)

Minimal seam — three endpoints, shapes above:

- `GET  /api/skills` → `Skill[]`
- `POST /api/invoke` `{skillId, agentId}` → `{answer, txHash, gross, net}`
- `GET  /api/wallet/:expert` → `{balance, lifetime, audit: AuditRow[]}`

Then in `lib/demo.tsx`, replace the reducer's mock settle in
`invoke_hero_settle` with the `POST /api/invoke` response, and point the
audit `tx` links at real Base Sepolia hashes. Everything else stays as-is.

**Fallback rule:** if integration wobbles at all, ship the mock — the demo
reads identically on stage, and real on-chain txs can be shown on BaseScan
history instead.
