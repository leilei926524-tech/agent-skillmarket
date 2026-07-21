# GOKUI SEO and accessibility review

Updated: 2026-07-22
Public frontend: https://1924902988hu-del.github.io/
API boundary: https://gokui.mesalaunch.com/

## SEO decisions

- The GitHub Pages URL is the current public canonical frontend. The Cloudflare Worker remains the API, manifest, D1, and x402 boundary.
- Every indexable route now has a unique title, description, and self-referencing canonical URL.
- `/skill/?slug=...` remains a client-rendered query route. It is `noindex, follow` until the build creates a stable static URL and server-rendered metadata for each approved Skill.
- `/console/` is public for receipt verification but `noindex, follow`; it is not a search landing page and is omitted from the sitemap.
- `robots.txt` and `sitemap.xml` cover the real static frontend routes.
- No `hreflang` URLs were added. The language switcher changes client content at one URL, and most locale content still falls back to English for new legal copy. Adding 60 equivalent locale URLs now would create thin or duplicate pages.
- The privacy notice, beta terms, and `security.txt` describe current product behavior and link to a private GitHub Security Advisory form. They do not invent a legal entity, support email, payout feature, or refund system.

## Accessibility changes

- Added a keyboard-visible skip link and a focusable main-content target.
- Added a consistent `:focus-visible` treatment and 44px mobile navigation targets.
- Added `aria-current="page"` to the active primary navigation link.
- Added accessible names to the language search and both SKILL.md text areas.
- Returned focus to the language trigger when the menu closes with Escape.
- Added `role="status"` to loading/success feedback and `role="alert"` to request failures.
- Added form autocomplete hints and disabled autocomplete/spellcheck for Agent API keys.
- Added new-tab announcements to ChatGPT, OpenAI-source, BaseScan, and private-contact links.
- Darkened the interactive blue token from `#2b63f6` to `#1746c4`. Calculated contrast against the page blue `#aecdf0` increased from 3.03:1 to 4.72:1. The glossy HTTP 402 illustration keeps its decorative bright gradient.

## Product fixes supported by the research

- Chinese storefront examples now resolve to the seeded English catalog:
  - `定价` → Deal Desk Discount Guardrails
  - `风控` → Prompt Injection Triage
  - `发票` → Cross-border Invoice Checklist
- Settled transaction hashes link to the correct Base or Base Sepolia explorer.
- Public request failures use localized, actionable copy instead of exposing raw English backend messages in a Chinese interface.

## QA evidence

Production-style static build used `NEXT_PUBLIC_API_BASE_URL=https://gokui.mesalaunch.com`.

- `npm run build`: passed; 12 static pages generated.
- Desktop 1440×900: homepage, store, privacy, terms, and payment activity inspected.
- Mobile 390×844: nine routes inspected; one H1 per route and zero horizontal overflow on every route.
- Search: `定价`, `风控`, and `发票` each returned the intended single Skill.
- Keyboard: first Tab focused the skip link; Enter moved focus to `#main-content`.
- Language menu: search received focus on open; Escape closed it and returned focus to the trigger.
- Failure path: mocked catalog HTTP 503 produced a localized live-region alert; removing the mock restored all three live Skills.
- Live API during local QA returned three Skills, one settled invocation, and a Base mainnet transaction receipt.
- Browser console: no application errors on normal paths. Next.js emitted only font-preload timing warnings.

Screenshots are stored locally under `output/playwright/` and intentionally ignored by Git.

## Deliberate follow-ups

- Do not add runtime analytics until the first-party allow-listed event endpoint, 30-day retention, and synthetic/team classification in `.agents/analytics-plan.md` are implemented together.
- The Chinese aliases currently improve the human storefront only. Agent API ranking still needs catalog-level multilingual synonyms or embeddings with a measurable relevance set.
- The remaining 58 locales inherit English for the new trust pages. Translate them only after English and Chinese policy wording is approved.
- Replace proxy customer research with five demand-side and five supply-side interviews before changing the homepage positioning again.
