# GOKUI curated catalog — first public batch

Review date: 2026-07-22 (Asia/Shanghai)

## Decision

Add 12 source-linked listings from seven established upstream publishers. Keep the existing three GOKUI x402 APIs separate. Curated entries are free, fixed to a reviewed commit, expose their original publisher and license, and cannot enter the paid invocation route.

This is a deliberately small first batch. Popularity helped find candidates but did not determine acceptance.

## Acceptance gates

1. A standard `SKILL.md` package exists at the pinned path.
2. The repository or skill directory has an explicit redistribution license.
3. Publisher, path, full commit SHA, and review date can be shown publicly.
4. The skill has a specific task boundary and adds coverage missing from the original three APIs.
5. The reviewed package contains no detected instruction override or credential-exfiltration payload.
6. Executable files and high-privilege workflows are disclosed in the risk summary.
7. The pinned GitHub URL returns HTTP 200.
8. GOKUI does not represent the author as a marketplace partner or charge for the source package.

## Accepted listings

| Listing | Upstream | Pinned commit | License | Reviewed package boundary | Risk label |
|---|---|---|---|---|---|
| React Performance Playbook | [Vercel](https://github.com/vercel-labs/agent-skills/tree/4559f18a20c1691c744b4395194290db6a0df5e9/skills/react-best-practices) | `4559f18a20c1691c744b4395194290db6a0df5e9` | MIT | Instructions plus rule references; no executable files | normal |
| Scalable React Composition | [Vercel](https://github.com/vercel-labs/agent-skills/tree/4559f18a20c1691c744b4395194290db6a0df5e9/skills/composition-patterns) | `4559f18a20c1691c744b4395194290db6a0df5e9` | MIT | Instructions plus rule references; no dynamic fetch | normal |
| Full Web Quality Audit | [Addy Osmani](https://github.com/addyosmani/web-quality-skills/tree/95d6e255afe1596b557d7a8498517884438f5b3a/skills/web-quality-audit) | `95d6e255afe1596b557d7a8498517884438f5b3a` | MIT | One local, read-only HTML shell analyzer using `find`, `grep`, and `jq` | normal |
| Customer Research | [Corey Haines](https://github.com/coreyhaines31/marketingskills/tree/67264763cb107d61749f418d081c56e5bcbc0209/skills/customer-research) | `67264763cb107d61749f418d081c56e5bcbc0209` | MIT | Instructions, source guide, and eval cases; no executable files | normal |
| Conversion Copywriting | [Corey Haines](https://github.com/coreyhaines31/marketingskills/tree/67264763cb107d61749f418d081c56e5bcbc0209/skills/copywriting) | `67264763cb107d61749f418d081c56e5bcbc0209` | MIT | Instructions, writing references, and eval cases; no executable files | normal |
| Analytics Tracking Plan | [Corey Haines](https://github.com/coreyhaines31/marketingskills/tree/67264763cb107d61749f418d081c56e5bcbc0209/skills/analytics) | `67264763cb107d61749f418d081c56e5bcbc0209` | MIT | Planning references; production implementations can send user data to analytics vendors | caution |
| Differential Security Review | [Trail of Bits](https://github.com/trailofbits/skills/tree/cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af/plugins/differential-review/skills/differential-review) | `cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af` | CC-BY-SA-4.0 | Requests repository read, shell, and report-write access | caution |
| Supply Chain Risk Audit | [Trail of Bits](https://github.com/trailofbits/skills/tree/cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af/plugins/supply-chain-risk-auditor/skills/supply-chain-risk-auditor) | `cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af` | CC-BY-SA-4.0 | Repository and dependency triage; not an active vulnerability scanner | caution |
| Distinctive Frontend Design | [Anthropic](https://github.com/anthropics/skills/tree/fa0fa64bdc967915dc8399e803be67759e1e62b8/skills/frontend-design) | `fa0fa64bdc967915dc8399e803be67759e1e62b8` | Apache-2.0 | Instruction-only package with a per-skill Apache license | normal |
| MCP Server Builder | [Anthropic](https://github.com/anthropics/skills/tree/fa0fa64bdc967915dc8399e803be67759e1e62b8/skills/mcp-builder) | `fa0fa64bdc967915dc8399e803be67759e1e62b8` | Apache-2.0 | Python evaluation helpers and external-service integration guidance | caution |
| LLM & Agent Observability | [Elastic](https://github.com/elastic/agent-skills/tree/96736bec4aa27f236580a3fefc4b14582f0f8aa0/skills/observability/llm-obs) | `96736bec4aa27f236580a3fefc4b14582f0f8aa0` | Apache-2.0 | Read-oriented Elastic telemetry queries; prompt and trace data can be sensitive | caution |
| NVIDIA RAG Blueprint | [NVIDIA](https://github.com/NVIDIA/skills/tree/fdbb8edec29b72a482140c1d14e4484a600739de/skills/rag-blueprint) | `fdbb8edec29b72a482140c1d14e4484a600739de` | CC-BY-4.0 / Apache-2.0 | Can deploy, reconfigure, restart, or remove Docker/Kubernetes infrastructure | high |

## Rejected or deferred

- **OpenAI `skills`: rejected as an upstream source.** Its current README marks the repository deprecated and points developers to the Plugins repository.
- **Anthropic document skills: rejected for this batch.** The repository explicitly separates many Apache-2.0 examples from document skills that are source-available under restrictive per-skill terms.
- **Vercel Web Design Guidelines: deferred.** The reviewed `SKILL.md` fetches the latest remote guideline file on every run instead of remaining fully bound to the pinned skill commit.
- **Large generated vendor catalogs: deferred.** Hundreds of narrow cloud-product skills would inflate the count without improving first-visit comprehension; add them only after category navigation and demand evidence exist.
- **Unknown community publishers without an explicit license: rejected.** Stars, install counts, or marketplace rank do not replace a rights and provenance check.

## Security counterview and resulting control

The 2026 paper [Agent Skills in the Wild](https://arxiv.org/abs/2601.10338) reports that 26.1% of analyzed public skills contained at least one vulnerability pattern and that packages with executable scripts were materially riskier than instruction-only skills. This result is not a verdict on any one accepted package, but it makes a raw “copy popular skills into production” approach indefensible.

GOKUI therefore lists pinned source packages without executing or reselling them. Risk labels describe the reviewed commit, not future upstream changes. Updating a listing requires a new source review and a new pinned commit.

## Verification evidence

- 12/12 pinned GitHub URLs returned HTTP 200 on 2026-07-22.
- Local D1 migration produced 15 approved entries: 3 paid APIs and 12 curated sources.
- Every curated API record exposes `delivery.type = external_source`, `invokeUrl = null`, publisher, license, full commit, and source path.
- Invoking a curated slug with a valid agent key returns HTTP 409 and `source_only_skill` before the x402 payment middleware.
- Desktop and 390 px catalog/detail/empty-search checks completed without horizontal overflow or browser console errors. Two local Next.js font-preload warnings appeared on the detail route; they do not affect the catalog behavior.
