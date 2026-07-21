# GOKUI product marketing context

Version: 1.0  
Updated: 2026-07-22

## What the product is

GOKUI is a marketplace where people publish repeatable professional know-how as agent Skills, and AI agents can discover, pay for, and call those Skills when a task needs them.

The current product has three connected parts:

1. A public Skill store for people to browse.
2. An AI-assisted publishing flow that turns a professional workflow into `SKILL.md`, then checks and queues it for review.
3. An agent API that issues revocable keys, recommends Skills for a task, and charges per successful x402 invocation.

## Target users

### Primary demand-side user

AI agent builders and operators who need a current, task-specific way of working instead of another generic answer. They want their agent to find a suitable Skill, understand the price and risk, and use it without rebuilding the workflow from scratch.

### Primary supply-side user

Professionals and small teams with a repeatable workflow they can keep current and publish as a Skill. They understand the work but may not know the `SKILL.md` format.

### Secondary audience

Technical reviewers, investors, and early partners who need to see that submission, discovery, invocation, and payment are real. This audience is context, not the homepage persona.

## Problem

- General AI is broad, but it often lacks the latest operating method for a specific task.
- Useful professional judgment is trapped in people's heads, chat histories, and internal documents.
- Agent builders have no simple, common way to discover, inspect, pay for, and reuse that judgment.
- Professionals should not need to learn a technical file format before publishing what they know.

## Value proposition

### Core promise

把专家能力装进 AI。

### Supporting promise

复用专业人士持续更新的 Skills，让 AI 更准确地完成每项任务。

### Demand-side benefit

让 AI 为当前任务找到一个能直接用的专业工作方法，并按次付费调用。

### Supply-side benefit

告诉 AI 你会怎么做，它帮你整理成 Skill；检查后即可提交发布。

## Why GOKUI is different

- AI-assisted publishing: the professional starts with a conversation, not a blank `SKILL.md`.
- Built for both people and agents: people can browse; agents can search and call the same catalog through an API.
- Pay per use: x402 settles a fixed USDC charge at invocation time instead of requiring a subscription.
- Clear limits: automated checks and manual review reduce obvious risks, but do not claim that third-party Skills are safe or endorsed.

## Primary actions by page

- Homepage: browse a live Skill.
- Store: choose a Skill and inspect its price, publisher, and risk note.
- Submit: copy the AI prompt, generate `SKILL.md`, and submit it for review.
- Agent access: create an agent key, describe the task, and get a ranked recommendation.
- Skill detail: inspect the Skill and test the payment gate.
- Payment activity: verify completed calls and transaction receipts.

## Likely objections and honest answers

- “我不会写 SKILL.md。” — 不用先学格式；先让 AI 逐步提问并生成文件。
- “这些 Skill 安全吗？” — 上架前会做自动检查和人工审核，但第三方 Skill 仍需按最小权限使用。
- “付款是真的吗？” — Production currently shows one settled 0.01 USDC invocation on Base mainnet with a transaction hash. This proves the payment path, not customer traction.
- “Agent 会不会乱花钱？” — Keys are revocable, the registration flow records a daily budget, and the buyer should also enforce origin, asset, recipient, and spend limits.
- “平台会自动给创作者分钱吗？” — Not yet. Payments currently settle to the platform wallet; automated creator payouts are not live.

## Verified proof points

As of 2026-07-22, the production API reports:

- 3 available Skills.
- 1 settled invocation.
- Base mainnet (`eip155:8453`).
- A settled 0.01 USDC payment with an onchain transaction hash.

Do not present these numbers as adoption, revenue growth, or product-market fit.

## Voice

Direct, concise, capable, and human. Use everyday verbs. Explain technical terms only when they help the user make a decision. One sentence should carry one idea. Sound like a knowledgeable product builder speaking to another builder, not a protocol paper or a pitch-deck generator.

## Preferred customer language

- 把专家能力装进 AI
- 找到适合这项工作的 Skill
- 告诉 AI 你会怎么做
- 不用先学 SKILL.md
- 用一次，付一次
- 看清价格、权限和风险
- 每笔调用和付款都能查到
- 提交审核

## Words and patterns to avoid in public Chinese copy

- 面向高能力 Agent 的技能市场层
- 市场层 / 能力层 / 结算架构
- 面向人类的店面 / 面向机器的发现接口
- 机器入口 / 机器调用契约
- 原生结算 / 可验证结算 / 结算活动
- 技能包 / 支付质询 / 签发密钥
- 赋能 / 生态 / 闭环 / 革新 / 重新定义
- Unsupported superlatives such as “最佳”, “最安全”, or “行业领先”.
- Empty symmetrical slogans and feature lists that do not explain why the user should care.

Technical documentation may still use exact protocol terms such as `HTTP 402`, `x402 v2`, `PAYMENT-SIGNATURE`, `USDC`, `API key`, `D1`, and `Base mainnet` where precision matters.

## Changelog

- 2026-07-22: Created the first shared positioning, audience, proof, voice, and public-copy guardrails for the Chinese site rewrite.
