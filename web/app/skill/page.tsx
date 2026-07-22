"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, localizedSkill, PublicSkill, usd } from "@/lib/live";
import { useI18n } from "@/lib/i18n";

function SkillDetail() {
  const { locale, t } = useI18n();
  const params = useSearchParams();
  const slug = params.get("slug") || "deal-desk-discount-guardrails";
  const [skill, setSkill] = useState<PublicSkill | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [agentKey, setAgentKey] = useState("");
  const [probe, setProbe] = useState<Record<string, unknown> | null>(null);
  const [installCopied, setInstallCopied] = useState(false);

  useEffect(() => {
    setSkill(null);
    setError("");
    setMissing(false);
    api<{ skill: PublicSkill }>(`/api/v1/skills/${encodeURIComponent(slug)}`)
      .then((data) => setSkill(data.skill))
      .catch((err) => {
        if (err.status === 404) setMissing(true);
        else setError(err.message);
      });
  }, [slug]);

  async function probeGate() {
    if (!skill?.invokeUrl) return;
    setProbe({ status: "requesting" });
    try {
      const response = await fetch(skill.invokeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${agentKey}`, "Idempotency-Key": `browser-${crypto.randomUUID()}` },
        body: JSON.stringify(skill.exampleInput || {}),
      });
      const body = await response.json().catch(() => ({})) as { error?: { code?: string } };
      const paymentRequired = response.headers.get("PAYMENT-REQUIRED");
      if (response.status === 402 && paymentRequired) {
        try {
        const normalized = paymentRequired.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
        const accepted = decoded.accepts?.[0] || {};
        setProbe({
          httpStatus: response.status,
          payment: {
            amountUsd: accepted.amount ? (Number(accepted.amount) / 1_000_000).toFixed(3) : null,
            network: accepted.network || null,
            asset: accepted.asset || null,
            payTo: accepted.payTo || null,
            scheme: accepted.scheme || null,
            timeoutSeconds: accepted.maxTimeoutSeconds || null,
          },
        });
        return;
        } catch {
          setProbe({ httpStatus: response.status, message: locale === "zh-CN" ? "收到付款要求，但页面无法读取。请不要签名付款，稍后再试。" : "The payment requirement could not be read. Do not sign it; try again later." });
          return;
        }
      }
      const code = body.error?.code || "";
      const messages: Record<string, string> = locale === "zh-CN" ? {
        agent_key_required: "请先创建并填写 Agent API key。",
        invalid_agent_key: "这把 API key 无效或已经撤销。",
        daily_budget_exceeded: "这次调用会超过 Agent 的每日预算。",
        facilitator_credentials_missing: "付款验证服务暂不可用；此时不会扣款。",
        payments_not_configured: "收款配置尚未完成；此时不会扣款。",
      } : {
        agent_key_required: "Create and enter an Agent API key first.",
        invalid_agent_key: "This API key is invalid or revoked.",
        daily_budget_exceeded: "This call would exceed the Agent's daily budget.",
        facilitator_credentials_missing: "Payment verification is unavailable. No payment was taken.",
        payments_not_configured: "The recipient is not configured. No payment was taken.",
      };
      setProbe({
        httpStatus: response.status,
        message: messages[code] || (locale === "zh-CN" ? "没有拿到可用的付款要求，请稍后再试；此时不会扣款。" : "No usable payment requirement was returned. Try again later; no payment was taken."),
      });
    } catch {
      setProbe({ message: locale === "zh-CN" ? "无法连接付款服务。请检查网络后再试；此时不会扣款。" : "The payment service could not be reached. Check the connection and try again; no payment was taken." });
    }
  }

  if (missing) return <main className="mx-auto max-w-4xl px-6 py-12"><div className="panel p-8"><h1 className="text-3xl font-bold">{locale === "zh-CN" ? "这个 Skill 还没有上架。" : "This Skill is not listed."}</h1><p className="text-dim mt-3">{locale === "zh-CN" ? "地址可能写错了，或者该 Skill 已经下架。" : "The address may be incorrect, or the listing may have been removed."}</p><Link href="/store" className="btn-ink mt-6">{locale === "zh-CN" ? "返回 Skill 商店" : "Back to the store"}</Link></div></main>;
  if (error) return <main className="mx-auto max-w-4xl px-6 py-12"><div className="error-box" role="alert">{t("common.requestFailed")}</div><Link href="/store" className="btn-outline mt-5">{locale === "zh-CN" ? "返回 Skill 商店" : "Back to the store"}</Link></main>;
  if (!skill) return <main className="mx-auto max-w-4xl px-6 py-12 mono" role="status">{t("skill.loading")}</main>;

  const isZh = locale === "zh-CN";
  const display = localizedSkill(skill, locale);
  const isCurated = skill.provenance.listingKind === "curated";
  const source = skill.provenance.source;
  const versionLabel = skill.version.startsWith("git-") ? skill.version : `v${skill.version}`;
  const exampleInput = JSON.stringify(skill.exampleInput || {}, null, 2);
  const probing = probe?.status === "requesting";
  const installPrompt = source ? (isZh ? `请帮我安全地安装并使用下面这个 Agent Skill：

Skill：${display.title}
固定源码：${source.url}
固定 commit：${source.commit || "未提供"}
仓库路径：${source.path || "未提供"}
许可证：${skill.license}
GOKUI 风险提示：${display.riskSummary}

请按以下顺序操作：
1. 先读取固定 commit 下的完整文件、依赖、脚本和许可证，不要改用最新版或其他分支。
2. 告诉我这个 Skill 适用于什么任务、会读取什么、需要哪些工具或权限、准备修改哪些文件。
3. 检查可疑命令、外部下载、密钥访问、数据上传、删除、付款、发布和其他重要写入。
4. 在我明确确认前，不要安装、执行脚本或修改我的环境。
5. 确认后，只安装到你当前明确支持的 Skill 目录或客户端；使用最小权限，绝不把密码、私钥、API key 或个人数据发给第三方。
6. 安装完成后，列出实际新增或修改的文件、固定 commit、验证结果和卸载方法。

如果当前客户端不支持安装、固定文件不完整、许可证不清楚或风险无法判断，请停止并说明原因，不要猜测或绕过。` : `Help me safely install and use this agent Skill:

Skill: ${display.title}
Pinned source: ${source.url}
Pinned commit: ${source.commit || "not provided"}
Repository path: ${source.path || "not provided"}
License: ${skill.license}
GOKUI risk note: ${display.riskSummary}

Follow this order:
1. Inspect the complete files, dependencies, scripts, and license at the pinned commit. Do not switch to the latest branch or another version.
2. Explain what the Skill is for, what it reads, which tools or permissions it needs, and which files you plan to change.
3. Check for suspicious commands, remote downloads, secret access, data uploads, deletion, payment, publishing, or other consequential writes.
4. Do not install, run scripts, or change my environment until I explicitly confirm.
5. After confirmation, install only into a Skill directory or client you can verify is supported. Use least privilege and never expose passwords, private keys, API keys, or personal data.
6. After installation, list every file added or changed, the pinned commit, validation results, and removal steps.

If this client cannot install Skills, the pinned files are incomplete, the license is unclear, or the risk cannot be assessed, stop and explain why. Do not guess or bypass the limitation.`) : "";
  const curl = skill.invokeUrl ? `curl -i -X POST '${skill.invokeUrl}' \\
  -H 'Authorization: Bearer $GOKUI_API_KEY' \\
  -H 'Idempotency-Key: your-unique-request-id' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(skill.exampleInput || {})}'` : "";

  async function copyInstallPrompt() {
    let copied = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(installPrompt);
      copied = true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = installPrompt;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      copied = document.execCommand("copy");
      textarea.remove();
    }
    if (!copied) return;
    setInstallCopied(true);
    window.setTimeout(() => setInstallCopied(false), 2500);
  }

  return (
    <main className="mx-auto max-w-[1100px] px-6 pb-10 w-full">
      <section className="pt-10 pb-8">
        <Link href="/store" className="meta text-[10px] text-violet">{t("skill.back")}</Link>
        <div className="kicker mt-6 mb-3">{display.category} · {versionLabel}{isCurated ? ` · ${isZh ? "GOKUI 社区精选" : "GOKUI community pick"}` : ""}</div>
        <h1 className="display-hero text-4xl md:text-6xl">{display.title}</h1>
        <p className="mt-5 text-lg leading-relaxed max-w-3xl">{display.description}</p>
      </section>

      <div className="grid lg:grid-cols-[1.4fr_.8fr] gap-4">
        <div className="panel p-6">
          <div className="kicker !text-[9px] mb-4">{isCurated ? (isZh ? "固定上游版本" : "Pinned upstream package") : t("skill.machineContract")}</div>
          {isCurated ? (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-y-2 sm:gap-y-3 text-sm">
                <dt className="text-dim">{isZh ? "原作者" : "Upstream author"}</dt><dd>{skill.publisher}</dd>
                <dt className="text-dim">{t("skill.license")}</dt><dd>{skill.license}</dd>
                <dt className="text-dim">Commit</dt><dd className="mono text-xs break-all">{source?.commit || "—"}</dd>
                <dt className="text-dim">{isZh ? "上游路径" : "Upstream path"}</dt><dd className="mono text-xs break-all">{source?.path || "—"}</dd>
                <dt className="text-dim">{isZh ? "费用" : "Price"}</dt><dd className="mono font-bold">{isZh ? "免费查看上游" : "Free · upstream source"}</dd>
              </dl>
              <div className="flex flex-wrap gap-3 mt-6">
                <button type="button" className="btn-ink" onClick={copyInstallPrompt}>{installCopied ? (isZh ? "已复制，发给你的 AI" : "Copied — send it to your AI") : (isZh ? "复制给 AI 安装" : "Copy for AI install")}</button>
                {source && <a className="btn-outline" href={source.url} target="_blank" rel="noopener noreferrer">{isZh ? "查看固定版本源码 ↗" : "Open pinned source ↗"}</a>}
              </div>
              <p className="text-xs text-dim leading-relaxed mt-4">{isZh ? "先让 AI 检查文件和权限；只有你确认后，它才会安装。不同客户端的安装位置不同，这不是通用的一键安装。" : "Your AI must inspect the files and permissions first, then wait for your confirmation. Install locations vary by client; this is not a universal one-click installer."}</p>
              <details className="mt-5 border-t border-line/70 pt-4">
                <summary className="cursor-pointer text-sm font-semibold">{isZh ? "预览给 AI 的安装指令" : "Preview the AI install handoff"}</summary>
                <pre className="code-block whitespace-pre-wrap max-h-96 overflow-auto mt-4">{installPrompt}</pre>
              </details>
              <p className="text-xs text-dim leading-relaxed mt-5">{isZh ? "这是 GOKUI 主动筛选的索引，不是原作者提交或合作入驻。安装前仍需在上游仓库核对完整文件、依赖和许可证。" : "This is a GOKUI-curated index, not an author submission or partnership. You must still verify the complete files, dependencies, and license in the upstream repository before installation."}</p>
            </>
          ) : (
            <>
              <dl className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-y-2 sm:gap-y-3 text-sm">
                <dt className="text-dim">{t("skill.invokePrice")}</dt><dd className="mono font-bold">{usd(skill.price.amount)} USDC</dd>
                <dt className="text-dim">{t("skill.protocol")}</dt><dd className="mono">x402 v2 · exact</dd>
                <dt className="text-dim">{t("skill.publisher")}</dt><dd>{skill.publisher}</dd>
                <dt className="text-dim">{t("skill.license")}</dt><dd>{skill.license}</dd>
                <dt className="text-dim">{t("skill.endpoint")}</dt><dd className="mono text-xs break-all">{skill.invokeUrl}</dd>
              </dl>
              <details className="mt-5">
                <summary className="text-sm font-bold cursor-pointer">{isZh ? "查看输入示例" : "View example input"}</summary>
                <pre className="code-block mt-3">{exampleInput}</pre>
              </details>
              <pre className="code-block mt-6">{curl}</pre>
            </>
          )}
        </div>

        <div className="panel p-6">
          <div className="kicker !text-[9px] mb-3">{t("skill.riskResult")}</div>
          <div className={`text-2xl font-bold ${skill.risk.level === "normal" ? "text-green" : "text-amber"}`}>{skill.risk.level === "normal" ? t("common.risk.normal") : skill.risk.level === "high" ? t("common.risk.high") : t("common.risk.caution")}</div>
          <p className="text-sm text-dim leading-relaxed mt-3">{display.riskSummary}</p>
          <div className="mt-5 pt-5 border-t border-line text-xs leading-relaxed">{t("skill.riskNote")}</div>
        </div>
      </div>

      {!isCurated && (
        <div className="panel p-6 mt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[260px]"><label className="kicker !text-[9px]" htmlFor="agent-key">{t("skill.probeLabel")}</label><input id="agent-key" type="password" autoComplete="off" spellCheck={false} className="field mt-2" value={agentKey} onChange={(e) => setAgentKey(e.target.value)} placeholder="gokui_live_…" /></div>
            <button type="button" className="btn-ink" onClick={probeGate} disabled={!agentKey || probing} aria-busy={probing}>{probing ? (isZh ? "正在检查…" : "Checking…") : t("skill.request")}</button>
          </div>
          <p className="text-xs text-dim mt-3">{t("skill.probeNote")}</p>
          {probe && (
            <div className="code-block mt-5" role="status">
              {probe.status === "requesting" ? (
                <span>{isZh ? "正在检查付款要求…" : "Checking payment requirements…"}</span>
              ) : probe.httpStatus === 402 && probe.payment ? (
                <dl className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-y-2 text-xs">
                  <dt className="text-dim">HTTP</dt><dd>402 · {isZh ? "需要付款" : "Payment required"}</dd>
                  <dt className="text-dim">{isZh ? "金额" : "Amount"}</dt><dd>${String((probe.payment as Record<string, unknown>).amountUsd)} USDC</dd>
                  <dt className="text-dim">{isZh ? "网络" : "Network"}</dt><dd>{String((probe.payment as Record<string, unknown>).network)}</dd>
                  <dt className="text-dim">{isZh ? "收款地址" : "Recipient"}</dt><dd className="break-all">{String((probe.payment as Record<string, unknown>).payTo)}</dd>
                  <dt className="text-dim">{isZh ? "方式" : "Scheme"}</dt><dd>{String((probe.payment as Record<string, unknown>).scheme)}</dd>
                </dl>
              ) : <p>{probe.httpStatus ? `HTTP ${String(probe.httpStatus)} · ` : ""}{String(probe.message || (isZh ? "请求没有完成。" : "The request could not be completed."))}</p>}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default function SkillPage() {
  const { t } = useI18n();
  return <Suspense fallback={<main className="p-10 mono" role="status">{t("common.loading")}</main>}><SkillDetail /></Suspense>;
}
