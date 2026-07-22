# GOKUI differential review — 2026-07-22

## Decision

**DEPLOYED — production release verified at `https://tryexpertos.com`.**

The five product branches are implemented and internally consistent. Type, build, fresh-migration, copy, API, retention, browser, remote-migration, and repeated production HTTPS checks pass. The existing GitHub private-vulnerability-reporting link remains the only public contact route; a team-controlled support email is still an explicit follow-up rather than an invented fact.

| Severity | Open | Resolved in worktree |
|---|---:|---:|
| Critical | 0 | 0 |
| High | 0 | 2 |
| Medium | 3 | 2 |
| Low | 2 | 1 |

**Overall residual risk: MEDIUM.** The review found no new critical or high-severity vulnerability in the selected architecture. The public support contact and a controlled concurrent paid-call exercise remain release-quality follow-ups; neither invalidates the verified static, API, D1, or existing settlement path.

## Scope and baseline

- Repository: `leilei926524-tech/agent-skillmarket`
- Branch: `agent/yc-marketplace-mvp`
- Baseline reviewed: `e8595932c0e79940474294e3ac6b9a2fa9fc63b7`
- Released commits: `9776aeb` (production-ready marketplace flows) and `eb5aeec` (static security contact).
- Change surface: 50 modified or new files covering Worker API, D1 migrations, x402 middleware configuration, search and recommendation, Agent key lifecycle, submission recovery, invocation retention, free Skill installation handoff, failure UX, public copy, metadata, responsive navigation, accessibility, and smoke coverage.
- No dependency versions changed in this diff.
- The branch was pushed to Draft PR #2. Remote migrations `0004`–`0007` and Worker/static deployment were completed; no merge or new payment was performed.

## Review methodology and confidence

This was a focused differential review against the baseline commit rather than an audit of every historical line in the repository. The repository contains roughly 1,880 TypeScript/TSX source files; the full 50-file worktree diff was classified by risk, then the Worker routes, x402/idempotency path, D1 migrations, retention job, submission-token flow, scanner rules, and their callers were reviewed line by line. Public copy and low-risk locale edits received broad consistency and browser checks rather than independent semantic review in every language.

The review used the baseline diff, relevant git history and string history, endpoint/call-site tracing, fresh-database migrations, adversarial API cases, automated regressions, and real Chromium smoke tests. No dependency version changed, no previously documented security fix was removed, and no suspicious broad deletion was found. Confidence is high for the analyzed local recovery, retention, validation, and key-revocation paths; overall confidence remains medium until the production x402 path and concurrent paid calls are reconciled against D1 and Base.

## Security model and blast radius

The highest-risk path is:

`Agent key → task recommendation → paid Skill input validation → server budget check → x402 verification → atomic D1 reservation/result write → settlement → receipt status update`

The most sensitive stored data is:

- publisher and Agent-owner email addresses;
- API-key and submission-token hashes;
- paid invocation request hashes, short-lived outputs, and payment receipts (new calls do not write plaintext input);
- payment signature hashes, transaction hashes, amounts, and network identifiers.

The public frontend is a static export served by Cloudflare Worker Assets at the same origin. The Worker owns the dynamic API, D1, scheduled retention, and x402 responsibilities. GitHub Pages and earlier Worker/custom-domain URLs remain compatibility entry points, not the canonical release.

## Findings

### DR-001 — High — invocation requests and results had no deletion schedule

**Status: resolved in this worktree.**

The selected design stores the request hash but writes JSON `null` to the legacy non-null `input_json` column (`worker/src/index.ts:410-434`). Results receive a 24-hour expiry. A replay at or after expiry clears the result and returns `410 invocation_result_expired` with receipt metadata rather than charging again (`worker/src/index.ts:362-379`). An hourly Cron invokes D1 cleanup (`wrangler.jsonc:9-11`, `worker/src/index.ts:533-537`, `worker/src/retention.ts:15-32`).

Migration `0006_invocation_retention.sql:1-17` clears historical plaintext inputs, backfills expiries, removes already-expired outputs, and adds an expiry index. The cleanup also clears any legacy plaintext row and backfills a missing expiry, reducing migration/deploy-gap risk. The privacy notice states the precise boundary: replay stops at 24 hours; stored output can remain until the next hourly cleanup.

Adversarial scenario checked: an authenticated caller replays a settled idempotency key after expiry. The handler rejects it with 410, clears output, returns only receipt evidence, and does not enter x402, preventing a duplicate payment. This path was verified against local D1.

### DR-002 — High product reliability — submission recovery existed only inside one browser session

**Status: resolved in this worktree.**

The no-login design now builds a recovery URL in the URL fragment, copies it on demand, and restores status after a new page load (`web/app/submit/page.tsx:215-235`, `web/app/submit/page.tsx:279-290`). URL fragments are not sent in HTTP requests. The raw token is sent only in `X-Submission-Token`; D1 retains its SHA-256 hash. The status endpoint returns an explicit allowlist rather than spreading the database row (`worker/src/index.ts:198-218`).

Adversarial scenario checked: an unauthenticated attacker guesses a submission id or supplies a wrong token. The endpoint returns the same 404 boundary and does not reveal existence or publisher data. Anyone who obtains the complete recovery link can read that submission's status; the UI therefore labels it a private bearer link and warns against sharing it. This is the intended no-account tradeoff.

The browser flow was verified by creating a submission, refreshing the fragment URL, recovering status, copying the private link, and exercising an invalid-link failure at 390px.

### DR-003 — Medium — email-only creation limits are easy to evade

**Status: accepted only for a tightly monitored beta.**

Submission and Agent-key creation limits count unverified email strings. An attacker can rotate addresses to spam D1, create many keys, or increase manual-review load.

Before open public promotion, add at least one of:

- Cloudflare rate limiting keyed by IP and route;
- Turnstile on human web forms while preserving the Agent API boundary;
- email verification for account-owned resources;
- operational alerting and a safe cleanup path.

### DR-004 — Medium — interrupted x402 state could reserve budget forever

**Status: fixed in this worktree.**

The new atomic reservation counts `executed` rows to close the concurrent-budget race. A Worker interruption between the D1 insert and settlement-status update could otherwise leave the idempotency key permanently in progress and reserve budget indefinitely.

The fix:

- counts only `executed` rows from the last ten minutes;
- changes an older repeated invocation to `payment_unknown`;
- requires the caller to check wallet and receipt evidence before choosing a new idempotency key;
- adds an Agent/status/time D1 index for the budget query.

This favors duplicate-payment prevention over automatic retry.

### DR-005 — Medium — real concurrent paid-call behavior is not covered by an automated integration test

**Status: residual validation gap.**

The reservation uses one conditional `INSERT ... SELECT` inside `D1Database.batch()`, followed by an invoke-counter update that depends on that inserted id. The SQL avoids float comparison by converting amounts to integer micro-units. D1 processes database queries serially, and a batch is transactional, so the storage design closes the observed race.

However, local development lacks production facilitator credentials and cannot execute two real paid requests. Before a larger release, run a controlled low-value concurrency test against an isolated Agent budget and reconcile:

- buyer responses;
- D1 invocation rows and statuses;
- Base transaction hashes;
- receiving-wallet balance.

### DR-006 — Medium product trust — privacy and terms contact is not yet a proven public support path

**Status: deployed with a documented limitation.**

The UI and `security.txt` currently link to GitHub Security Advisories. A new user may not be able to use that route unless repository private vulnerability reporting and permissions are configured. Replace it with a real team-controlled support/security email or prove that the GitHub private-reporting route works from a signed-out or ordinary external account. The production release does not claim that such an email exists.

### DR-007 — Low — 57 locale files do not yet contain newer legal and failure keys

**Status: known deferred work.**

English, Simplified Chinese, and Japanese now contain the complete current 219-key copy set. The remaining 57 locale files fall back to English for newer footer, request-failure, privacy, and terms keys. `bun run i18n:check` correctly fails and remains a visible release-quality debt; it was not suppressed. `bun run i18n:check:core` provides a narrow collaboration gate for the reviewed English, Chinese, and Japanese files. This review intentionally did not mass-generate the remaining translations. A separate full-tree scan found and removed machine placeholder tokens from 28 existing submit-flow strings across Amharic, Danish, French, Icelandic, Korean, Norwegian, Polish, Somali, Swahili, Swedish, Tamil, and Vietnamese.

### DR-008 — Low — deployment order can briefly expose legacy retention behavior

**Status: operational release constraint; mitigated in code.**

The new Worker requires columns added by migration `0006`, so the migration must precede deployment. During that short interval, the old Worker can still create a row with plaintext `input_json` and no expiry. The hourly cleanup scrubs any such row and backfills its expiry (`worker/src/retention.ts:17-31`). For release, apply the migration, deploy the Worker immediately, manually trigger the scheduled handler once, and verify no row has `input_json <> 'null'` or a missing expiry. Do not leave a long migration/deployment gap.

## Important fixes verified in the diff

- Unknown or missing delivery types fail closed to source-only instead of becoming paid endpoints.
- Paid input is parsed and validated before x402 presents a payment requirement.
- Idempotency keys cannot be reused across Skills or with a changed payload.
- Daily budgets reject non-finite values and use per-Skill price, not a global price.
- Conditional D1 reservation prevents two in-flight calls from both consuming the same remaining budget.
- Agent keys can revoke themselves; revoked keys return 401.
- Machine search and recommendation share localized aliases and do not pad unrelated recommendations.
- Public listings expose real input contracts and per-Skill examples for paid runners.
- Submission and payment-probe failures show actionable user messages instead of raw API JSON.
- Curated listings disclose pinned upstream commit, source, authorship boundary, license, and no GOKUI resale.
- Free curated listings generate a commit-pinned, permission-aware “copy for AI install” handoff and wait for user confirmation before installation.
- Paid invocation plaintext input is not stored; result replay closes at 24 hours and stale idempotency keys cannot trigger a second payment.
- No-login submission recovery uses a URL fragment and hash-only server storage; the status API returns allowlisted fields.
- Mobile navigation exposes all primary destinations without clipped or wrapped labels.
- Language selection uses a dialog/native buttons, restores focus, and updates `lang`/`dir` before hydration.

## Validation evidence

Passed:

- `bun run typecheck`
- `bun run test` (10 focused search, relevance, input-validation, fail-closed delivery, retention, and scanner-confirmation regressions)
- `bun run build` (Next static export plus Wrangler deploy dry run)
- `bun run copy:check`
- `git diff --check`
- clean application of migrations `0001` through `0007` to a fresh local D1 database
- 15/15 skill rows with valid alias JSON, localization JSON, and Chinese risk summaries
- local API: Chinese search, stopword-only empty search, relevant recommendation, unrelated empty recommendation, invalid-budget rejection, input rejection before payment, Agent revoke then 401
- real Chromium at 390px and 1440px across home, store, submit, Agents, paid and curated Skill detail, activity, payment explanation, privacy, terms, and 404 surfaces
- 390px submission failure (422) with actionable correction, followed by corrected success (201), private recovery-link refresh, and invalid recovery failure
- 390px invalid Agent name and invalid/revoked API-key messages
- local scheduled-handler purge: HTTP 200, output changed to JSON `null`, and `purged_at` set
- expired idempotent replay: HTTP 410, no second x402 attempt, stored input/output both JSON `null`
- internal navigation and Agent manifest links returned HTTP 200 locally
- no horizontal overflow and no broken images on the reviewed pages
- Arabic direction switch and focus return from the language dialog
- remote D1 migrations `0004`–`0007`, followed by `No migrations to apply`
- remote privacy invariants: zero plaintext inputs, zero missing expiries, zero expired retained outputs, and no foreign-key violations
- production catalog invariants: 15 approved Skills, 15 localized risk summaries, one preserved settled invocation, and one preserved submission
- production failure boundaries: invalid price `422`, missing Agent key `401`, missing admin key `403`, unknown API route `404`
- `https://tryexpertos.com` and `https://www.tryexpertos.com` over HTTPS; canonical, Open Graph URL, manifest origins, sitemap, robots, and `security.txt` use `tryexpertos.com`
- two consecutive HTTPS passes returned `200` for the homepage, health, manifest, store, submit, Agent, wallet, activity, privacy, terms, robots, sitemap, and `security.txt`
- production browser QA after client hydration: 390×844 across nine routes and 1440×900 across six core routes, with zero horizontal overflow and zero broken images
- deployed root HTML SHA-256 matched the local production export
- English, Simplified Chinese, and Japanese each contain 219 non-empty keys; the scoped three-language check, public-copy check, build, and production browser QA passed
- Japanese production QA covered home, submission, Agent access, privacy, and terms at 390×844 plus the desktop homepage at 1440×900, with no horizontal overflow or broken images

Expected failure:

- `bun run i18n:check` because 57 locale files are missing the newer legal/privacy/failure keys described in DR-007.

Not yet run:

- a new real x402 payment with this release (intentionally skipped to avoid an unnecessary charge; the existing settled invocation remains visible and reconciled);
- controlled concurrent paid-call test.

## Post-release follow-ups

1. add and verify a team-controlled support/security email, then update privacy, terms, and `security.txt` together;
2. run a controlled low-value concurrent x402 exercise and reconcile buyer responses, D1 rows, Base transactions, and the receiving-wallet balance;
3. translate the newer legal, privacy, and failure keys in the 57 deferred locale files with the same reviewed-language gate used for English, Chinese, and Japanese;
4. add abuse controls before broad public promotion: Cloudflare rate limiting, Turnstile or verified accounts for human forms, and operational alerts;
5. enable an HTTP-to-HTTPS redirect at the zone level if the team wants every plaintext request upgraded automatically; the canonical product and all verified entry points already use HTTPS.

## Primary references

- Cloudflare D1 limits and single-threaded query processing: https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare D1 `batch()` sequential transaction and rollback behavior: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Coinbase x402 buyer quickstart: https://docs.cdp.coinbase.com/x402/quickstart-for-buyers
- x402 exact EVM scheme specification: https://github.com/x402-foundation/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md
- Coinbase Agentic Wallet security model: https://docs.cdp.coinbase.com/wallets/security-and-policies/security-overview
