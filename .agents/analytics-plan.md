# GOKUI minimal analytics plan

Updated: 2026-07-22
Purpose: measure whether external professionals and agent builders complete the two core workflows without collecting content, credentials, wallet signatures, or durable identity.

## Decisions this data must inform

1. Do professionals understand the AI-assisted publishing flow and reach a valid submission?
2. Can builders find a relevant Skill by task, create an Agent key, and reach the payment gate?
3. Where does a legitimate buyer stop between HTTP 402 and a settled result?
4. Which failures require product work: discovery, format validation, trust, price, payment plumbing, or output quality?
5. Are any external users repeating a settled invocation?

Pageviews, scroll depth, language-switch clicks, and raw traffic are not primary success metrics unless they explain one of these decisions.

## Privacy model

- No names, emails, full IP addresses, wallet signatures, API keys, admin keys, raw task text, raw search queries, uploaded `SKILL.md`, prompts, outputs, or error messages.
- Use a random session identifier stored in `sessionStorage`; it expires when the browsing session ends and is never joined to an email or Agent key.
- Store only allow-listed event names and properties.
- Store server-confirmed conversions separately from client intent.
- Retain raw event rows for 30 days; retain daily aggregate counts longer.
- Document the collection in a public privacy page before production activation.

## North-star evidence

Not a vanity “marketplace volume” number:

**External successful Skill uses per week** — settled invocations made by non-team Agents where the Skill result returned successfully.

Until team/non-team classification is implemented safely, report settled invocations as technical usage and label team tests separately in operations data, not public analytics.

## Core funnels

### Supply funnel

1. `submit_page_viewed`
2. `ai_prompt_copied`
3. `skill_markdown_loaded`
4. `skill_prescan_passed`
5. `submission_completed` — server-confirmed

### Demand and payment funnel

1. `store_page_viewed`
2. `skill_search_completed`
3. `skill_detail_viewed`
4. `agent_access_completed` — server-confirmed
5. `recommendation_completed` — server-confirmed
6. `payment_required_returned` — server-confirmed HTTP 402
7. `invocation_settled` — server-confirmed

## Event specification

| Event | Trigger | Allowed properties | Decision |
|---|---|---|---|
| `submit_page_viewed` | Submit page becomes visible | locale, source_page | Baseline for publishing intent |
| `ai_prompt_copied` | Copy succeeds | locale, prompt_version | Is the AI-first entry understood? |
| `skill_markdown_loaded` | File/paste parses locally | locale, input_method, parse_success, size_bucket | Does AI handoff produce usable files? |
| `skill_prescan_passed` | Worker scan passes | risk_level, warning_count, skill_version | Where validation blocks supply |
| `submission_completed` | D1 insert succeeds | submission_id, risk_level, category_count | Real external supply conversion |
| `store_page_viewed` | Store becomes visible | locale, referrer_group | Demand baseline |
| `skill_search_completed` | Debounced local/API search completes | locale, query_length_bucket, results_count | Discovery failure without storing task text |
| `skill_detail_viewed` | Skill detail loads | locale, skill_slug, publisher_type, price_usd | Which Skills receive inspection |
| `agent_access_completed` | Agent record created | budget_bucket, purpose_length_bucket | Builder activation without storing email/purpose |
| `recommendation_completed` | Ranking returns | result_count, top_skill_slug, max_price_bucket | Task-to-Skill relevance |
| `payment_required_returned` | Invoke endpoint returns 402 | skill_slug, amount_usd, network | Buyer reaches monetization boundary |
| `invocation_settled` | Settlement verified and result returned | skill_slug, amount_usd, network, result_status | Successful paid use |
| `workflow_error` | Allow-listed product error | stage, error_code, locale | Prioritize failure classes; never store message/body |

## Property buckets

- `query_length_bucket`: `0`, `1_10`, `11_30`, `31_plus`
- `size_bucket`: `under_5kb`, `5_25kb`, `25_100kb`
- `budget_bucket`: `under_1`, `1_5`, `5_20`, `20_plus`
- `purpose_length_bucket`: `20_100`, `101_250`, `251_500`
- `max_price_bucket`: `none`, `under_0_10`, `0_10_1`, `1_plus`
- `referrer_group`: `direct`, `github`, `search`, `social`, `other`

## Data-quality requirements

- Client events need a unique `event_id`; Worker inserts idempotently.
- Server-confirmed events are emitted only after the corresponding D1/payment operation succeeds.
- Do not count button clicks as completed submissions, Agent registrations, recommendations, or settlements.
- Exclude synthetic QA Agents and known team test events from traction reporting using an internal flag set at creation time, not heuristics based on email or wallet.
- Validate every event on desktop and 390px; confirm no duplicate emission after reload, retry, or idempotent replay.
- Monitor unknown event names and rejected property keys as errors, not as new schema.

## Operating dashboard

Weekly, report:

- Supply conversion: `submission_completed / submit_page_viewed`
- AI handoff conversion: `skill_markdown_loaded / ai_prompt_copied`
- Prescan pass rate: `skill_prescan_passed / skill_markdown_loaded`
- Discovery zero-result rate: searches with `results_count = 0 / skill_search_completed`
- Builder activation: `agent_access_completed / agents_page_viewed` once the baseline event exists
- Payment completion: `invocation_settled / payment_required_returned`
- Repeat external settled Agents: unique non-team Agent IDs with 2+ settlements in seven days, computed server-side and never exposed as raw identifiers
- Error rate by stage and allow-listed error code

## Interpretation rules

- High `ai_prompt_copied` and low `skill_markdown_loaded`: the cross-tool AI handoff is failing or users do not return.
- High loaded and low prescan: generated files or scanner feedback are inadequate.
- High prescan and low submission: form/trust/rights confirmation blocks supply.
- High searches and high zero-result rate: catalog coverage or multilingual retrieval is the constraint.
- High detail views and low Agent access: integration burden or trust is the constraint.
- High 402 and low settlement: price visibility, wallet setup, payment client, or trust is the constraint.
- High settlement and low repeat use: output quality or recurring job frequency is the constraint.

## Implementation order

1. Add public privacy/terms disclosures and analytics schema documentation.
2. Add an allow-listed, rate-limited first-party event endpoint or an equivalent privacy-minimal provider.
3. Instrument only the events above.
4. Add internal test-event classification.
5. Validate with synthetic sessions, then keep the data private until at least five external sessions exist.

Do not add GA4, PostHog session replay, advertising pixels, or a persistent cross-site identifier by default. Revisit the tool choice only when the decisions above require capabilities the first-party design cannot provide.
