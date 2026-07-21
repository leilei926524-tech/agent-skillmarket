"use client";

import { FormEvent, useState } from "react";
import { api, PublicSkill } from "@/lib/live";

type Access = { agent: { id: string; name: string; dailyBudgetUsd: string }; apiKey: string; warning: string; endpoints: Record<string, string> };
type Recommendation = { task: string; recommendations: { rank: number; score: number; reason: string; skill: PublicSkill }[]; rankingDisclosure: string };

export default function Agents() {
  const [form, setForm] = useState({ name: "", ownerEmail: "", purpose: "", dailyBudgetUsd: "1.00" });
  const [access, setAccess] = useState<Access | null>(null);
  const [key, setKey] = useState("");
  const [task, setTask] = useState("Evaluate a B2B SaaS discount request safely before the sales agent sends a quote.");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState("");
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
      <section className="pt-10 pb-8"><div className="kicker mb-3">Machine entry · REST + x402</div><h1 className="display-hero text-4xl md:text-6xl">Give your agent<br />a way in.</h1><p className="mt-5 max-w-3xl text-base leading-relaxed">Register a named agent, receive a revocable key once, and let it search or rank approved skills. Payment remains a separate x402 challenge enforced at invocation time.</p></section>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="panel p-6"><div className="kicker !text-[9px] mb-5">01 · ISSUE AN AGENT KEY</div>{access ? <div><div className="success-box"><b>{access.agent.name} is active.</b><br />The key below is shown once.</div><pre className="code-block mt-4 break-all whitespace-pre-wrap">{access.apiKey}</pre><button className="btn-outline mt-4" type="button" onClick={() => navigator.clipboard.writeText(access.apiKey)}>COPY KEY</button><p className="text-xs text-dim mt-4">{access.warning}</p></div> : <form onSubmit={register} className="space-y-4"><label className="label">Agent name<input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="procurement_agent_01" required /></label><label className="label">Owner email<input className="field" type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} required /></label><label className="label">Purpose<textarea className="field min-h-28" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="What work will this agent perform and why does it need marketplace access?" required minLength={20} /></label><label className="label">Daily budget policy · USD<input className="field" type="number" min="0.01" max="100" step="0.01" value={form.dailyBudgetUsd} onChange={(e) => setForm({ ...form, dailyBudgetUsd: e.target.value })} /></label><button className="btn-ink">CREATE AGENT ACCESS →</button></form>}</div>
        <div className="panel p-6"><div className="kicker !text-[9px] mb-5">02 · LIVE RECOMMENDATION</div><label className="label">Agent API key<input type="password" className="field" value={key} onChange={(e) => setKey(e.target.value)} placeholder="exp_live_…" /></label><label className="label mt-4">Task<textarea className="field min-h-32" value={task} onChange={(e) => setTask(e.target.value)} /></label><button type="button" className="btn-ink mt-4" onClick={recommend} disabled={!key || task.length < 10}>FIND THE BEST SKILL →</button>{error && <div className="error-box mt-4">{error}</div>}</div>
      </div>
      {recommendation && <section className="mt-4"><div className="grid md:grid-cols-3 gap-4">{recommendation.recommendations.map((item) => <div className="panel p-5" key={item.skill.id}><div className="flex justify-between"><span className="mono text-3xl font-bold text-violet">0{item.rank}</span><span className="chip bg-white/50 border border-line">score {item.score}</span></div><h2 className="font-bold text-lg mt-4">{item.skill.title}</h2><p className="text-sm text-dim mt-2 leading-relaxed">{item.reason}</p><a href={`/skill?slug=${encodeURIComponent(item.skill.slug)}`} className="btn-outline mt-5">VIEW + INVOKE</a></div>)}</div><p className="text-xs text-dim mt-4">{recommendation.rankingDisclosure}</p></section>}
      <section className="panel p-6 mt-4"><div className="kicker !text-[9px] mb-4">AGENT QUICKSTART</div><pre className="code-block whitespace-pre-wrap">{`# machine-readable marketplace contract\ncurl https://YOUR_HOST/.well-known/agent-skills.json\n\n# authenticated search\ncurl -H "Authorization: Bearer $EXPERTOS_API_KEY" \\\n  "https://YOUR_HOST/api/v1/agent/skills?q=pricing"\n\n# invocation returns 402 until an x402 client pays and retries\ncurl -i -X POST -H "Authorization: Bearer $EXPERTOS_API_KEY" \\\n  -H "Idempotency-Key: job-20260721-001" \\\n  -H "Content-Type: application/json" \\\n  -d '{"discountPercent":25,"annualContractValueUsd":100000,"termMonths":24,"prepaid":true}' \\\n  https://YOUR_HOST/api/v1/skills/deal-desk-discount-guardrails/invoke`}</pre></section>
    </main>
  );
}
