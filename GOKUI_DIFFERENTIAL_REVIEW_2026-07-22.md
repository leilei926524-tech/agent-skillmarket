# GOKUI differential review — 2026-07-22

## Executive summary

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low / follow-up | 2 |

**Overall risk:** low
**Recommendation:** conditional approve after a clean final build and publication verification

The change is frontend-only. It does not modify Worker routes, authentication, D1 writes, x402 verification, payment settlement, secrets, or admin controls. The material additions are metadata, public trust pages, keyboard and form semantics, client-side Chinese search aliases, and fixed-origin BaseScan links.

## What changed

**Baseline:** `23f3483` (`Fix Agent manifest link for static mirrors`)
**Review range:** baseline working tree to current local changes
**Strategy:** deep review; the changed production scope is small and all changed frontend files were read

| Area | Risk | Behavioral impact |
|---|---|---|
| Route metadata, robots, sitemap | Low | Points search engines to the GitHub Pages frontend; query Skill pages and payment activity are not indexed |
| Privacy, terms, security contact | Low | Publishes factual beta disclosures and fixed GitHub contact links |
| Navigation and forms | Low | Adds focus, names, autocomplete, and live-region semantics |
| Store aliases | Low | Maps three fixed Chinese intent groups to existing catalog terms in the browser |
| Payment receipt link | Low | Builds a BaseScan URL from a backend transaction hash under a fixed trusted origin |
| Color token | Low | Improves text and focus contrast; decorative HTTP 402 gradient remains unchanged |

## Baseline invariants and trust boundaries

1. The static frontend may read public Worker APIs but cannot authenticate, settle, approve, or mutate records without the existing API flows.
2. Agent API keys remain in component memory unless the user copies them; no new persistence or logging was added.
3. Submission status tokens remain in `sessionStorage`; the server stores only their hashes.
4. Prices, settlement status, network, and transaction hashes remain server-sourced.
5. Public content must not describe a scan as an endorsement or promise creator payouts that do not exist.
6. External navigation must use a fixed `https` origin and `rel="noreferrer"` when opening a new tab.

The diff preserves all six invariants.

## Adversarial review

### Fixed-origin transaction links

**Attacker model:** a malicious or corrupted public activity row controls `tx_hash` and `network`.
**Entry point:** `/api/v1/public/activity` rendered by `/console/`.
**Analysis:** the value is appended to a hard-coded `https://basescan.org/tx/` or `https://sepolia.basescan.org/tx/` path and rendered by React. It cannot select a new scheme or host, and React escapes displayed text. A malformed hash can create a broken explorer URL but not script execution or an open redirect.
**Result:** no exploitable security regression found.

### Search alias input

**Attacker model:** an unauthenticated storefront visitor controls the search string.
**Entry point:** local React state on `/store/`.
**Analysis:** fixed regular expressions select fixed English tokens, and matching occurs against already-rendered text. The query is not inserted as HTML, executed, or sent to a new endpoint.
**Result:** no injection or data-exposure path found.

### Public trust/contact links

**Attacker model:** a visitor follows a public external link.
**Analysis:** ChatGPT, OpenAI Help, GitHub Security Advisories, and BaseScan links use fixed HTTPS origins and `noreferrer`. No user value controls their host.
**Result:** no open redirect or opener-control path found.

## Test coverage analysis

No repository unit or automated accessibility suite covers these UI changes. This is the main coverage limitation, but the changed logic is low risk and received browser-level checks:

- optimized Next.js static build and TypeScript validation;
- desktop and 390px route inspection;
- metadata, canonical, H1, and overflow checks;
- keyboard skip-link and language-dialog focus checks;
- three multilingual search cases;
- mocked HTTP 503 and recovery;
- live Worker reads and BaseScan receipt rendering.

## Low-priority findings

1. **Agent-side multilingual relevance is still incomplete.** The storefront aliases do not change `/api/v1/agent/recommend`; a Chinese Agent task can still fall back to popularity/risk. Add catalog-level synonyms or a tested semantic retrieval layer before claiming multilingual Agent discovery.
2. **No automated regression suite exists.** Convert the browser checks into a small committed test only after the public deployment workflow and canonical frontend repository are consolidated; otherwise the test would encode the current two-repository publishing split.

## Recommendation

No critical, high, or medium blocker was found in the local diff. Approve the implementation after:

1. a clean final production-style build;
2. confirmation that the publishing task is no longer writing the same frontend files;
3. publication to the actual GitHub Pages source repository;
4. two HTTPS 200 checks plus visual/metadata verification on the public URL.

Do not describe the local change as deployed until all four conditions are satisfied.
