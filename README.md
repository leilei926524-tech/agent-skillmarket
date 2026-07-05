# ExpertOS — agent-skillmarket

**The Human Intelligence Layer for AI agents** — agents invoke encrypted
expert skills instantly, or hire verified humans when no skill exists;
every completed human task becomes tomorrow's reusable AI skill.

c0mpiled in Japan pt.3 (Osaka, 2026-07-05) · YC RFS tracks: Software for
Agents × Company Brain.

## Structure

- `web/` — Skill Store + Seller Wallet frontend (Next.js 16, Tailwind v4).
  Demo-driver built in, zero backend dependency. See `web/INTEGRATION.md`
  for the keyboard beats and the backend contract.

## Run the frontend

```bash
cd web
bun install   # or npm install
bun dev       # or npm run dev → http://localhost:3000
```

Demo keys: `1` invoke · `2` human-hire flow · `3` mint skill · `P` ambient · `R` reset.

## Team

@Yudai core pipeline (MCP registry → buyer agent → settlement) ·
@Salehin seed skills + business page · @Tim001 storefront + wallet ·
@koki pitch + demo choreography (16:00 freeze).
