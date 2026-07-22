# GOKUI curated catalog differential security review

Review date: 2026-07-22
Baseline: `bf5e212`
Review target: `88d646d`
Production Worker version: `d765b521-2dce-4d56-877f-166ae36ac6f8`
GitHub Pages release: `3ff0086`

## Executive summary

| Severity | Open | Resolved during review |
|---|---:|---:|
| Critical | 0 | 0 |
| High | 0 | 0 |
| Medium | 0 | 1 |
| Low | 0 | 0 |

**Overall implementation risk:** Medium because this change modifies D1 schema, public catalog contracts, and the pre-x402 invocation path.
**Recommendation:** Approve. The remote migration, production smoke test, public catalog checks, and desktop/mobile online QA passed.

Key metrics:

- 14 changed implementation/data/documentation files in `bf5e212..88d646d`.
- 738 additions and 97 deletions, including the curated-data migration and review reports.
- 2 high-risk files reviewed deeply: `worker/src/index.ts` and `worker/migrations/0003_curated_catalog.sql`.
- 3 direct `publicSkill()` consumers checked.
- 12/12 pinned upstream URLs returned HTTP 200.
- 1 pre-existing idempotency ordering issue found and fixed during review.

## What changed

| File | Risk | Behavioral effect | Blast radius |
|---|---|---|---|
| `worker/migrations/0003_curated_catalog.sql` | High | Adds delivery/provenance fields and 12 curated rows | All catalog reads after migration |
| `worker/src/index.ts` | High | Rejects source-only invokes before payment and binds idempotency keys to skill IDs | One public invoke endpoint |
| `worker/src/utils.ts` | Medium | Exposes delivery and provenance; fails closed for non-`paid_api` values | 3 API response paths |
| `worker/src/types.ts` | Medium | Adds the D1 record contract | Worker compile-time consumers |
| `web/lib/live.ts` | Medium | Adds public delivery/provenance types | Store, detail, recommendation UI |
| `web/app/store/page.tsx` | Medium | Separates paid APIs from curated source listings | Catalog page |
| `web/app/skill/page.tsx` | Medium | Replaces payment controls with source provenance for curated listings | Skill detail page |
| `web/app/agents/page.tsx` | Low | Labels source recommendations honestly | Recommendation cards |
| `scripts/smoke.ts` | Medium | Blocks deployment if provenance or payment isolation fails | Production smoke workflow |
| `README.md`, curation report, EN/ZH copy | Low | Documents the new trust boundary | Public and maintainer documentation |

## Resolved finding

### Medium: an old idempotency replay could run before the new source-only boundary

**File:** `worker/src/index.ts` invoke middleware
**Historical context:** the original ordering was introduced in `c7127ea`. It queried a prior invocation by `(agent_id, idempotency_key)` and returned a settled replay before loading the requested skill.

**Attacker model:** an authenticated agent that already owns a settled invocation and its idempotency key.

**Attack sequence before the fix:**

1. The agent makes and settles a paid invocation for Skill A.
2. The same agent calls a curated source-only Skill B with Skill A's idempotency key.
3. The old middleware returns Skill A's cached result before it loads Skill B.
4. The request bypasses the new `source_only_skill` response.

The result belonged to the same agent, so this was not a cross-tenant disclosure or a payment bypass for new execution. It did violate endpoint identity and the new guarantee that curated slugs never enter invocation handling.

**Fix applied:** the middleware now loads the requested skill first, rejects every non-`paid_api` delivery before x402, selects `skill_id` with any prior idempotent record, and returns `409 idempotency_key_reused` when the key belongs to another skill.

**Status:** resolved in the reviewed diff.

## Adversarial checks

### Curated row submitted as a paid endpoint

- **Entry point:** `POST /api/v1/skills/:slug/invoke`
- **Control:** any present delivery value other than `paid_api` returns `409 source_only_skill` before budget calculation or x402 middleware.
- **Result:** blocked locally with a valid agent key.

### Malformed delivery value

- **Entry point:** a bad D1 value such as `external-source`.
- **Control:** both the public serializer and invoke middleware fail closed; the serializer presents it as external source and invoke rejects it.
- **Result:** no implicit fallback to paid execution.

### Third-party author represented as a partner

- **Entry point:** public store/detail API and UI.
- **Control:** `listingKind = curated`, `curatedBy = GOKUI`, `publisherVerified = false`, and explicit copy says the listing is not an author submission or partnership.
- **Result:** original publisher is attribution, not a claim of marketplace participation.

### Source URL script injection

- **Entry point:** curated detail source link.
- **Control:** the reviewed migration contains only explicit `https://github.com/` URLs, links use `target="_blank"` with `rel="noopener noreferrer"`, and public submissions cannot set provenance fields.
- **Residual risk:** a future admin/data migration could insert a bad scheme. Add a database constraint or serializer URL validation before opening curated writes to admins.

### Unreviewed third-party execution

- **Entry point:** GOKUI paid invocation and fallback instruction runner.
- **Control:** curated records are source-only, have `invokeUrl = null`, and are rejected before x402. Full upstream packages are not copied into `skill_markdown` or executed by GOKUI.
- **Result:** the new catalog expansion does not broaden the paid runtime's third-party execution surface.

## Test coverage

| Invariant | Evidence | Result |
|---|---|---|
| 3 paid + 12 curated rows | Local D1 query through `/api/v1/skills` | Pass |
| Curated provenance complete | API assertion: GitHub URL + 40-char commit + source path | Pass |
| Curated invoke cannot reach payment | Authenticated local request returns `409 source_only_skill` | Pass |
| Existing paid path remains distinct | Production smoke returned an x402 v2 challenge on Base mainnet to the configured payee | Pass |
| Public types compile | `bun run typecheck` | Pass |
| Static site builds | `bun run build` including Wrangler dry run | Pass |
| Public copy scan | `bun run copy:check` | Pass |
| Remote migration | D1 reports 15 approved rows: 3 paid APIs + 12 curated source listings | Pass |
| Production API | `https://gokui.mesalaunch.com/` and `/api/health` returned 200 twice; production smoke passed 8 checks | Pass |
| Desktop public UI | GitHub Pages at 1440 px: 15 cards, one curated section, no horizontal overflow | Pass |
| Mobile public UI | GitHub Pages at 390 px: 15 cards and `clientWidth = scrollWidth = 390` | Pass |
| Empty search and recovery | Public 390 px Playwright flow shows the empty state and restores all 15 cards after clearing | Pass |
| Curated high-risk detail | Public NVIDIA detail has no API-key input, one pinned source link, and the high-risk label | Pass |
| Browser runtime | Public page fetched `https://gokui.mesalaunch.com/api/v1/skills` with HTTP 200; zero console errors/warnings | Pass |

The repository-wide i18n parity check still fails because 58 non-English/non-Chinese dictionaries were already missing legal and accessibility keys at baseline `bf5e212`. All 60 JSON dictionaries parse, this diff adds no translation key, and the user explicitly deferred the 60-language copy pass. This is a pre-existing release-quality limitation, not a regression from the curated catalog.

## Blast radius

- `publicSkill()` has three callers: public list, public detail, and agent recommendation.
- The invoke middleware is the sole paid execution entry point; its source-only check runs before the x402 middleware.
- The D1 migration changes every `SELECT * FROM skills` record but uses defaults that preserve existing GOKUI rows as paid APIs.
- Store/detail/agent UI consumers were updated together with the public API type, so there is no known stale internal caller.

## Historical context

- No authorization, payment, budget, or input-validation check was removed.
- The original three runner implementations and x402 middleware were not changed.
- The existing idempotency behavior came from the first marketplace implementation (`c7127ea`) and was tightened rather than relaxed.
- No security-fix or CVE-related code was reintroduced.

## Recommendations

### Blocking before production

- [x] Apply `0003_curated_catalog.sql` to remote D1 before deploying code that reads the new fields.
- [x] Run the updated production smoke test and confirm the existing x402 endpoint still returns a valid v2 challenge.
- [x] Verify the public catalog reports 15 total, 3 paid, 12 curated, and zero missing source URLs.
- [x] Check `/store` and one curated `/skill` page at desktop and 390 px on the public URL.

### Follow-up

- [ ] Add URL-scheme validation if provenance becomes writable through the admin API.
- [ ] Add an upstream-update job that opens a review request rather than silently moving pinned commits.
- [ ] Resolve the pre-existing 58-locale parity backlog in a separate pass.

## Methodology and limits

**Strategy:** deep review for a small TypeScript/SQL change with high-risk payment and state boundaries.

Techniques used:

- Baseline history and blame on invocation middleware.
- Full diff review and removed-validation scan.
- Call-site and blast-radius search.
- Adversarial modeling for payment isolation, provenance, URL handling, and idempotency.
- Static package scan of all accepted upstream directories for executable files, destructive commands, credential handling, external fetches, and instruction-override indicators.
- Local API, browser, desktop/mobile, and failure-path QA.

Limits:

- This was not a formal malware analysis of every upstream reference file.
- A risk label applies only to the pinned reviewed commit.
- GitHub publisher identity and license files were inspected, but GOKUI has no partnership or identity-verification relationship with these publishers.
- Production verification covers the published GOKUI build as of Worker version `d765b521-2dce-4d56-877f-166ae36ac6f8` and Pages commit `3ff0086`; it is not a standing guarantee for future upstream changes.

**Confidence:** high for GOKUI payment/provenance isolation; medium for the behavior of third-party packages after users install them outside GOKUI.
