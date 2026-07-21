# GOKUI customer research — proxy evidence baseline

Updated: 2026-07-22
Status: proxy research only; replace with first-party interviews and behavior data
Goal: identify what would make an agent builder discover, trust, pay for, and repeatedly use a third-party Skill, and what would make a professional publish one.

## Evidence boundary

GOKUI currently has three platform-authored seed Skills, zero external submissions, and one platform-run 0.01 USDC settlement. That proves a technical path, not demand. No customer persona or market-size claim should be derived from this document.

Source weighting used here:

- GitHub issues from identifiable product users: medium-high for workflow friction.
- Community posts by builders: medium for pains and vocabulary; skeptical/technical bias.
- Marketplace-founder launch reports: low-medium; self-reported and promotional.
- Research papers: high for the studied security/quality mechanism, not for purchase intent.

## Provisional jobs to be done

### Demand side — agent builder or operator

1. When my agent reaches a task-specific gap, help it find a relevant Skill without making me search GitHub and manually compare folders.
2. Before loading or invoking a Skill, show me who published it, what it can access, what it depends on, what output to expect, and what evidence supports the claims.
3. Before a paid call, show the exact price and enforce a task/session/daily limit so retries cannot silently drain funds.
4. After a call, give me an inspectable result and receipt, plus a clear failure/dispute path when the paid output is unusable.
5. Let the Skill work in the agent/runtime I already use; do not make installation format and marketplace registration my problem.

### Supply side — professional or Skill creator

1. Turn a repeatable method I already use into a valid, portable Skill without requiring me to learn `SKILL.md` first.
2. Help qualified buyers and agents discover the Skill by the task it solves, not only by its file name.
3. Let me demonstrate credibility with provenance, examples, version history, boundaries, and real usage evidence.
4. Give me a credible path to getting paid; clearly distinguish platform collection from creator payout.

## Ranked themes

### 1. Discovery is part of the product, not a catalog page

Confidence: medium-high.

Evidence:

- An Anthropic Skills issue describes three rounds of web searching, non-obvious marketplace setup, bundle naming that hid the PDF Skill, and no in-CLI search or suggestion.
- An OpenHands issue asks for persisted personal repositories and multiple marketplace registrations; the current product still has incomplete registration and loading semantics.
- Marketplace builders repeatedly position the starting pain as Skills being scattered across local folders or GitHub and hard to evaluate.

Implication for GOKUI:

- The Agent API and `.well-known` manifest are more strategically important than another human storefront section.
- Search must support task language and locale aliases. A Chinese prompt such as “定价” cannot return zero while the English tag `pricing` exists.
- Each result should explain why it matched, compatibility, version, dependencies, risk, price, and evidence.

### 2. Provenance and bounded permissions are prerequisites for trust

Confidence: high for the risk; medium for willingness-to-pay impact.

Evidence:

- Anthropic issue #492 documents community Skills placed under an `anthropic/` namespace, creating false official provenance and lowering scrutiny for Bash/settings permissions.
- 2026 research on SKILL.md supply-chain attacks shows that description and instruction text affect discovery, selection, and governance; the file is operational input, not passive documentation.
- Marketplace posts emphasize security scanning, but self-reported scanning claims do not establish that a Skill is safe or useful.

Implication for GOKUI:

- Store publisher identity, repository URL, exact source commit, license, declared tools/dependencies, review date, version history, and a plain-language risk boundary.
- Reserve verified namespaces and never infer official status from a directory or publisher string.
- Separate three claims: format valid, automated scan passed, human review completed. None means “endorsed” or “safe.”

### 3. Installation and runtime compatibility routinely break

Confidence: medium-high.

Evidence:

- Anthropic issues report Skills not loading because of marketplace directory structure and plugins loading undeclared extra Skills.
- A Codex issue requests runnable third-party installation documentation because correct copying of `SKILL.md` plus bundled resources is not obvious.
- OpenHands describes missing persistence, source handling, commit-resolution, and update semantics for multiple marketplaces.

Implication for GOKUI:

- Do not promise “works everywhere” from format compatibility alone.
- Show tested runtimes, install method, bundled resources, dependencies, and pinned source commit.
- Offer machine-readable download/install metadata, but require user confirmation before installation or permissions expansion.

### 4. x402 payment works; everything around it determines adoption

Confidence: medium.

Evidence:

- Recent builder discussions describe the mandatory work around x402 as discovery, pay-retry handling, spend limits, failover, and accounting receipts.
- A two-month user report says payment itself was the easy part, while discovery, no refunds, unknown price before call, retry waste, and poor output remained painful.
- Other discussions ask for scoped per-task spend envelopes and signed intent receipts before value reaches the signer.

Implication for GOKUI:

- Show price before invocation and return structured payment requirements.
- Enforce per-call and daily caps now; add per-task/session limits before higher budgets.
- Preserve idempotency and return a receipt linking task intent, Skill version, amount, network, recipient, result status, and transaction.
- Do not present an onchain receipt as proof that output quality was acceptable.

### 5. Paid marketplace traction is possible but far from automatic

Confidence: low-medium.

Evidence:

- One marketplace founder self-reported roughly 100 registered users, three external creators, 12 Skills, and the first paid listing after two weeks.
- A later self-report from the same category claims larger organic traffic and 39 paid transactions, but remains unaudited promotional evidence.
- Another creator reports 22 Skills, 25.7K impressions, and only three sales, suggesting discovery does not guarantee purchase.

Implication for GOKUI:

- Do not optimize for Skill count. Optimize for one repeated job where a buyer can compare the Skill output with their current workaround.
- The first traction target should be five external publishers, five external agent builders, and at least three repeated paid invocations by someone other than the team.

## Current message hypotheses

These are hypotheses, not confirmed customer language:

- “Stop rebuilding the same workflow from scratch.”
- “Know who made the Skill, what it can touch, and what it costs before your agent uses it.”
- “Give the agent a budget, not a blank wallet.”
- “Tell AI how you do the work; it turns the method into a reviewable Skill.”

Do not replace the current homepage headline until first-party interviews confirm stronger language.

## First-party research plan

Minimum sample before changing positioning: 10 interviews.

### Five demand-side interviews

Recruit people who have used Codex, Claude Code, Cursor, OpenHands, MCP tools, or agent runtimes and have installed at least one third-party extension/Skill.

Ask:

1. Tell me about the last time your agent lacked a task-specific method. What did you do?
2. Where did you search, and what made a result look credible or unsafe?
3. Show me how you install and update a third-party Skill today.
4. What information would you need before allowing a paid invocation?
5. What is your acceptable per-call/task/month budget, and what would make you refuse autonomous payment?
6. What would count as a bad paid result, and what remedy would you expect?

### Five supply-side interviews

Recruit professionals with one repeatable workflow and evidence that they have performed it more than five times.

Ask:

1. Walk me through the last real case. Where did judgment matter?
2. Which inputs are required, what output is acceptable, and when must the workflow escalate?
3. What could safely be published, and what must remain private or company-specific?
4. Would you maintain this method after publishing? What would make that worthwhile?
5. Which proof would you be willing to show: identity, employer history, examples, references, or outcome data?
6. Would you prefer per-call revenue, a fixed sale, leads, or no monetization? Why?

### Success evidence

- High confidence: the same unprompted job/pain appears in at least three independent interviews and matches observed behavior.
- Medium confidence: appears in two interviews or only after prompting.
- Low confidence: one interview, community post, or founder claim.

## Sources

Accessed 2026-07-22.

- Anthropic Skills issue #675, discoverability and naming: https://github.com/anthropics/skills/issues/675
- Anthropic Skills issue #492, namespace trust boundary: https://github.com/anthropics/skills/issues/492
- Anthropic Skills issue #67, installation structure: https://github.com/anthropics/skills/issues/67
- OpenHands issue #14121, personal repositories and marketplace persistence: https://github.com/OpenHands/OpenHands/issues/14121
- OpenAI Codex issue #24227, runnable third-party install example: https://github.com/openai/codex/issues/24227
- Agensi early marketplace report: https://www.reddit.com/r/SideProject/comments/1rr6k68/i_built_a_marketplace_for_ai_agent_skill_files/
- Marketplace sales counter-signal: https://www.reddit.com/r/AI_Sales/comments/1uojv28/22_ai_skills_one_month_live_257k_impressions_3/
- x402 builder pain discussion: https://www.reddit.com/r/AI_Agents/comments/1sywivv/if_youre_building_an_agent_that_pays_for_tools/
- Two-month autonomous payment report: https://www.reddit.com/r/AI_Agents/comments/1uu8cb3/would_you_let_your_agent_pay_for_tools_by_itself/
- SKILL.md semantic supply-chain study: https://arxiv.org/abs/2605.11418
