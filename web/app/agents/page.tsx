"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, PublicSkill } from "@/lib/live";
import { useI18n } from "@/lib/i18n";

type Access = { agent: { id: string; name: string; dailyBudgetUsd: string }; apiKey: string; warning: string; endpoints: Record<string, string> };
type Recommendation = { task: string; recommendations: { rank: number; score: number; reason: string; skill: PublicSkill }[]; rankingDisclosure: string };

export default function Agents() {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", ownerEmail: "", purpose: "", dailyBudgetUsd: "1.00" });
  const [access, setAccess] = useState<Access | null>(null);
  const [key, setKey] = useState("");
  const [task, setTask] = useState("");
  const [taskTouched, setTaskTouched] = useState(false);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { if (!taskTouched) setTask(t("agents.taskDefault")); }, [t, taskTouched]);

  async function register(event: FormEvent) {
    event.preventDefault(); setError("");
    try { const result = await api<Access>("/api/v1/agents/access", { method: "POST", body: JSON.stringify(form) }); setAccess(result); setKey(result.apiKey); }
    catch (err) { setError((err as Error).message); }
  }

  async function recommend() {
    setError("");
    try { setRecommendation(await api<Recommendation>("/api/v1/agent/recommend", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify({ task, maxPriceUsd: Number(form.dailyBudgetUsd) }) })); }
    catch (err) { setError((err as Error).message); }
  }

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-12 w-full">
      <section className="pt-10 pb-8">
        <div className="kicker mb-3">{t("agents.kicker")}</div>
        <h1 className="display-hero text-4xl md:text-6xl">{t("agents.hero1")}<br />{t("agents.hero2")}</h1>
        <p className="mt-5 max-w-3xl text-base leading-relaxed">{t("agents.intro")}</p>
      </section>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="panel p-6">
          <div className="kicker !text-[9px] mb-5">{t("agents.issue")}</div>
          {access ? (
            <div>
              <div className="success-box" role="status"><b>{access.agent.name} {t("agents.active")}</b><br />{t("agents.keyOnce")}</div>
              <pre className="code-block mt-4 break-all whitespace-pre-wrap">{access.apiKey}</pre>
              <button className="btn-outline mt-4" type="button" onClick={() => navigator.clipboard.writeText(access.apiKey)}>{t("common.copyKey")}</button>
              <p className="text-xs text-dim mt-4">{access.warning}</p>
            </div>
          ) : (
            <form onSubmit={register} className="space-y-4">
              <label className="label">{t("agents.name")}<input className="field" autoComplete="off" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("agents.namePlaceholder")} required /></label>
              <label className="label">{t("agents.ownerEmail")}<input className="field" type="email" autoComplete="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} required /></label>
              <label className="label">{t("agents.purpose")}<textarea className="field min-h-28" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder={t("agents.purposePlaceholder")} required minLength={20} /></label>
              <label className="label">{t("agents.budget")}<input className="field" type="number" min="0.01" max="100" step="0.01" value={form.dailyBudgetUsd} onChange={(e) => setForm({ ...form, dailyBudgetUsd: e.target.value })} /></label>
              <button className="btn-ink">{t("agents.create")}</button>
            </form>
          )}
        </div>

        <div className="panel p-6">
          <div className="kicker !text-[9px] mb-5">{t("agents.recommendation")}</div>
          <label className="label">{t("agents.apiKey")}<input type="password" autoComplete="off" spellCheck={false} className="field" value={key} onChange={(e) => setKey(e.target.value)} placeholder="gokui_live_…" /></label>
          <label className="label mt-4">{t("agents.task")}<textarea className="field min-h-32" value={task} onChange={(e) => { setTaskTouched(true); setTask(e.target.value); }} /></label>
          <button type="button" className="btn-ink mt-4" onClick={recommend} disabled={!key || task.length < 10}>{t("agents.find")}</button>
          {error && <div className="error-box mt-4" role="alert">{t("common.requestFailed")}</div>}
        </div>
      </div>

      {recommendation && (
        <section className="mt-4" aria-live="polite">
          <div className="grid md:grid-cols-3 gap-4">
            {recommendation.recommendations.map((item) => (
              <div className="panel p-5" key={item.skill.id}>
                <div className="flex justify-between"><span className="mono text-3xl font-bold text-violet">0{item.rank}</span><span className="chip bg-white/50 border border-line">{t("common.score")} {item.score}</span></div>
                <h2 className="font-bold text-lg mt-4">{item.skill.title}</h2>
                <p className="text-sm text-dim mt-2 leading-relaxed">{item.reason}</p>
                <a href={`/skill?slug=${encodeURIComponent(item.skill.slug)}`} className="btn-outline mt-5">{t("common.viewInvoke")}</a>
              </div>
            ))}
          </div>
          <p className="text-xs text-dim mt-4">{recommendation.rankingDisclosure}</p>
        </section>
      )}

      <section className="panel p-6 mt-4">
        <div className="kicker !text-[9px] mb-4">{t("agents.quickstart")}</div>
        <pre className="code-block whitespace-pre-wrap">{`# ${t("agents.quickstart.manifest")}
curl https://YOUR_HOST/.well-known/agent-skills.json

# ${t("agents.quickstart.search")}
curl -H "Authorization: Bearer $GOKUI_API_KEY" \\
  "https://YOUR_HOST/api/v1/agent/skills?q=pricing"

# ${t("agents.quickstart.invoke")}
curl -i -X POST -H "Authorization: Bearer $GOKUI_API_KEY" \\
  -H "Idempotency-Key: job-unique-001" \\
  -H "Content-Type: application/json" \\
  -d '{"discountPercent":25,"annualContractValueUsd":100000,"termMonths":24,"prepaid":true}' \\
  https://YOUR_HOST/api/v1/skills/deal-desk-discount-guardrails/invoke`}</pre>
      </section>
    </main>
  );
}
