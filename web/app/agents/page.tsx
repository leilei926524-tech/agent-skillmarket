"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_ORIGIN, api, localizedSkill, PublicSkill } from "@/lib/live";
import { useI18n } from "@/lib/i18n";

type Access = { agent: { id: string; name: string; dailyBudgetUsd: string }; apiKey: string; warning: string; endpoints: Record<string, string> };
type Recommendation = { task: string; recommendations: { rank: number; score: number; matchedTerms?: string[]; reason: string; skill: PublicSkill }[]; rankingDisclosure: string };

function agentError(caught: unknown, isZh: boolean) {
  const typed = caught as Error & { data?: { error?: { code?: string; message?: string } } };
  if (!isZh) return typed.data?.error?.message || typed.message || "The request could not be completed.";
  const messages: Record<string, string> = {
    invalid_agent: "请把 Agent 信息填写完整后再试。",
    invalid_agent_name: "Agent 名称需要 3–64 个英文字符、数字、短横线或下划线。",
    invalid_agent_owner: "请填写有效邮箱，并用 20–500 个字符说明 Agent 的用途。",
    invalid_daily_budget: "每日预算需要在 0.01–100 USDC 之间。",
    agent_limit: "这个邮箱今天已经创建 5 把 key，请明天再试。",
    agent_key_required: "请先填写 Agent API key。",
    invalid_agent_key: "这把 API key 无效或已经撤销。",
    agent_not_active: "这把 API key 已经不是启用状态。",
    invalid_task: "请用 10–2000 个字符说清楚 Agent 要完成什么。",
    invalid_max_price: "最高价格必须是大于或等于 0 的数字。",
  };
  return messages[typed.data?.error?.code || ""] || "请求没有完成，请检查网络和填写内容后再试。";
}

export default function Agents() {
  const { locale, t } = useI18n();
  const [form, setForm] = useState({ name: "", ownerEmail: "", purpose: "", dailyBudgetUsd: "1.00" });
  const [access, setAccess] = useState<Access | null>(null);
  const [key, setKey] = useState("");
  const [task, setTask] = useState("");
  const [taskTouched, setTaskTouched] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => { if (!taskTouched) setTask(t("agents.taskDefault")); }, [t, taskTouched]);

  async function register(event: FormEvent) {
    event.preventDefault(); setError(""); setRegistering(true);
    try { const result = await api<Access>("/api/v1/agents/access", { method: "POST", body: JSON.stringify(form) }); setAccess(result); setKey(result.apiKey); setRevoked(false); }
    catch (err) { setError(agentError(err, locale === "zh-CN")); }
    finally { setRegistering(false); }
  }

  async function recommend() {
    setError(""); setRecommending(true);
    try { setRecommendation(await api<Recommendation>("/api/v1/agent/recommend", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify({ task, maxPriceUsd: Number(form.dailyBudgetUsd), locale }) })); }
    catch (err) { setRecommendation(null); setError(agentError(err, locale === "zh-CN")); }
    finally { setRecommending(false); }
  }

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(key);
      setKeyCopied(true);
      window.setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      setError(locale === "zh-CN" ? "复制失败，请手动保存这把 key。" : "Copy failed. Save this key manually.");
    }
  }

  async function revokeKey() {
    const confirmed = window.confirm(locale === "zh-CN" ? "确定撤销这把 API key？撤销后不能恢复。" : "Revoke this API key? This cannot be undone.");
    if (!confirmed) return;
    setError(""); setRevoking(true);
    try {
      await api("/api/v1/agents/revoke", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: "{}" });
      setAccess(null);
      setKey("");
      setRecommendation(null);
      setRevoked(true);
    } catch (err) {
      setError(agentError(err, locale === "zh-CN"));
    } finally {
      setRevoking(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-12 w-full">
      <section className="pt-10 pb-8">
        <div className="kicker mb-3">{t("agents.kicker")}</div>
        <h1 className="display-hero text-4xl md:text-6xl">{t("agents.hero1")}<br />{t("agents.hero2")}</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed">{t("agents.intro")}</p>
      </section>

      {error && <div className="error-box mb-4" role="alert">{error}</div>}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="panel p-6">
          <div className="kicker !text-[9px] mb-5">{t("agents.issue")}</div>
          {access ? (
            <div>
              <div className="success-box" role="status"><b>{access.agent.name} {t("agents.active")}</b><br />{t("agents.keyOnce")}</div>
              <pre className="code-block mt-4 break-all whitespace-pre-wrap">{access.apiKey}</pre>
              <button className="btn-outline mt-4" type="button" onClick={copyKey}>{keyCopied ? (locale === "zh-CN" ? "已复制" : "Copied") : t("common.copyKey")}</button>
              <span className="sr-only" role="status">{keyCopied ? (locale === "zh-CN" ? "API key 已复制" : "API key copied") : ""}</span>
              <p className="text-xs text-dim mt-4">{locale === "zh-CN" ? "请把 key 存进密码管理器或密钥服务，不要放进提示词、网页前端或代码仓库。" : access.warning}</p>
            </div>
          ) : (
            <form onSubmit={register} className="space-y-4">
              <label className="label">{t("agents.name")}<input className="field" autoComplete="off" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("agents.namePlaceholder")} required /></label>
              <label className="label">{t("agents.ownerEmail")}<input className="field" type="email" autoComplete="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} required /></label>
              <label className="label">{t("agents.purpose")}<textarea className="field min-h-28" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder={t("agents.purposePlaceholder")} required minLength={20} /></label>
              <label className="label">{t("agents.budget")}<input className="field" type="number" min="0.01" max="100" step="0.01" value={form.dailyBudgetUsd} onChange={(e) => setForm({ ...form, dailyBudgetUsd: e.target.value })} /></label>
              <button className="btn-ink" disabled={registering} aria-busy={registering}>{registering ? (locale === "zh-CN" ? "正在创建…" : "Creating…") : t("agents.create")}</button>
            </form>
          )}
        </div>

        <form className="panel p-6" onSubmit={(event) => { event.preventDefault(); void recommend(); }}>
          <div className="kicker !text-[9px] mb-5">{t("agents.recommendation")}</div>
          <label className="label">{t("agents.apiKey")}<input type="password" autoComplete="off" spellCheck={false} className="field" value={key} onChange={(e) => { setKey(e.target.value); setRevoked(false); }} placeholder="gokui_live_…" /></label>
          <label className="label mt-4">{t("agents.task")}<textarea className="field min-h-32" value={task} onChange={(e) => { setTaskTouched(true); setTask(e.target.value); }} /></label>
          <button type="submit" className="btn-ink mt-4" disabled={!key || task.length < 10 || recommending || revoking} aria-busy={recommending}>{recommending ? (locale === "zh-CN" ? "正在匹配…" : "Matching…") : t("agents.find")}</button>
          <button type="button" className="btn-outline mt-4 ms-3 text-amber" onClick={revokeKey} disabled={!key || recommending || revoking} aria-busy={revoking}>{revoking ? (locale === "zh-CN" ? "正在撤销…" : "Revoking…") : (locale === "zh-CN" ? "撤销这把 key" : "Revoke this key")}</button>
          {revoked && <div className="success-box mt-4" role="status">{locale === "zh-CN" ? "这把 API key 已撤销，之后的请求会被拒绝。" : "This API key is revoked. Future requests will be rejected."}</div>}
        </form>
      </div>

      {recommendation && (
        <section className="mt-4" aria-live="polite">
          {recommendation.recommendations.length ? (
            <div className="grid md:grid-cols-3 gap-4">
              {recommendation.recommendations.map((item) => {
                const display = localizedSkill(item.skill, locale);
                return (
                  <div className="panel p-5" key={item.skill.id}>
                    <div className="flex justify-between"><span className="mono text-3xl font-bold text-violet">0{item.rank}</span><span className="chip bg-white/50 border border-line">{t("common.score")} {item.score}</span></div>
                    <h2 className="font-bold text-lg mt-4">{display.title}</h2>
                    <p className="text-sm text-dim mt-2 leading-relaxed">{display.description}</p>
                    <p className="text-xs text-dim mt-3 leading-relaxed">{item.reason}</p>
                    <a href={`/skill?slug=${encodeURIComponent(item.skill.slug)}`} className="btn-outline mt-5">{item.skill.delivery.callable ? t("common.viewInvoke") : (locale === "zh-CN" ? "让 AI 安装" : "Install with AI")}</a>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel p-6">
              <h2 className="font-bold text-lg">{locale === "zh-CN" ? "还没有足够相关的 Skill" : "No trustworthy match yet"}</h2>
              <p className="text-sm text-dim mt-2">{locale === "zh-CN" ? "我们不会为了凑数推荐无关结果。你可以换一种说法，或者把缺少的 Skill 发布上来。" : "We will not pad the list with unrelated results. Try describing the task differently, or publish the missing Skill."}</p>
              <a href="/submit" className="btn-outline mt-5">{locale === "zh-CN" ? "发布这个 Skill" : "Publish the missing Skill"}</a>
            </div>
          )}
          <p className="text-xs text-dim mt-4">{recommendation.rankingDisclosure}</p>
        </section>
      )}

      <section className="panel p-6 mt-4">
        <div className="kicker !text-[9px] mb-4">{t("agents.quickstart")}</div>
        <pre className="code-block whitespace-pre-wrap">{`# ${t("agents.quickstart.manifest")}
curl ${API_ORIGIN}/.well-known/agent-skills.json

# ${t("agents.quickstart.search")}
curl -H "Authorization: Bearer $GOKUI_API_KEY" \\
  "${API_ORIGIN}/api/v1/agent/skills?q=pricing"

# ${t("agents.quickstart.invoke")}
curl -i -X POST -H "Authorization: Bearer $GOKUI_API_KEY" \\
  -H "Idempotency-Key: job-unique-001" \\
  -H "Content-Type: application/json" \\
  -d '{"discountPercent":25,"annualContractValueUsd":100000,"termMonths":24,"prepaid":true}' \\
  ${API_ORIGIN}/api/v1/skills/deal-desk-discount-guardrails/invoke`}</pre>
      </section>
    </main>
  );
}
