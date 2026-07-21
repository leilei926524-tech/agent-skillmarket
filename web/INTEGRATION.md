# Frontend ⇄ marketplace API

The browser uses same-origin `/api/v1/*` endpoints in production. For a separate local API, set `NEXT_PUBLIC_API_BASE_URL` before `next build`.

Live mode has no `localStorage` demo driver, random transactions, seeded balances, fake ratings, or silent mock fallback.

Primary contracts:

- `GET /api/v1/skills` → approved public catalog
- `POST /api/v1/submissions` → stored review receipt
- `POST /api/v1/agents/access` → one-time agent key
- `POST /api/v1/agent/recommend` → evidence-disclosed ranking
- `POST /api/v1/skills/:slug/invoke` → x402-protected JSON result

The generic `/skill?slug=...` route supports newly approved skills without rebuilding a dynamic route for each slug.
