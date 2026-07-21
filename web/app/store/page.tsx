"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, PublicSkill, usd } from "@/lib/live";

export default function Store() {
  const [skills, setSkills] = useState<PublicSkill[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ skills: PublicSkill[] }>("/api/v1/skills")
      .then((data) => setSkills(data.skills))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);
  const shown = useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? skills.filter((skill) => `${skill.title} ${skill.description} ${skill.category} ${skill.tags.join(" ")}`.toLowerCase().includes(q)) : skills;
  }, [query, skills]);
  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-10 w-full">
      <section className="pt-10 pb-8 flex flex-wrap items-end justify-between gap-6">
        <div><div className="kicker mb-3">Approved catalog · live API</div><h1 className="display-hero text-4xl md:text-6xl">Skills agents<br />can actually call.</h1></div>
        <div className="max-w-md w-full"><label className="kicker !text-[9px]" htmlFor="skill-search">SEARCH THE CATALOG</label><input id="skill-search" className="field mt-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="pricing, security, invoice…" /></div>
      </section>
      {loading && <div className="panel p-8 mono text-sm">LOADING APPROVED SKILLS…</div>}
      {error && <div className="error-box">Could not load the live catalog: {error}</div>}
      {!loading && !error && shown.length === 0 && <div className="panel p-8"><p>No approved skill matches that search.</p><Link href="/submit" className="btn-ink mt-5">SUBMIT THE MISSING SKILL</Link></div>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((skill) => (
          <Link key={skill.id} href={`/skill?slug=${encodeURIComponent(skill.slug)}`} className="panel panel-hover p-5 flex flex-col gap-4 min-h-[290px]">
            <div className="flex justify-between gap-3"><div><div className="kicker !text-[9px] mb-2">{skill.category}</div><h2 className="font-bold text-lg leading-snug">{skill.title}</h2></div><span className={`chip border h-fit ${skill.risk.level === "normal" ? "text-green border-green/30 bg-green/10" : "text-amber border-amber/40 bg-amber/10"}`}>{skill.risk.level}</span></div>
            <p className="text-sm text-dim leading-relaxed">{skill.description}</p>
            <div className="flex flex-wrap gap-1.5">{skill.tags.slice(0, 4).map((tag) => <span key={tag} className="chip bg-white/50 border border-line text-[10px]">{tag}</span>)}</div>
            <div className="mt-auto pt-4 border-t border-line/70 flex items-end justify-between gap-4"><div><div className="mono text-2xl font-bold">{usd(skill.price.amount)}<span className="text-xs text-dim font-normal"> / invoke</span></div><div className="meta text-[9px] text-dim mt-1">{skill.publisher} · v{skill.version}</div></div><div className="meta text-[10px] text-right"><span className="text-violet">X402</span><br />{skill.invokes} SETTLED</div></div>
          </Link>
        ))}
      </div>
      <div className="panel p-5 mt-6 text-sm leading-relaxed"><b>What “approved” means:</b> the manifest passed automated format and heuristic checks and a beta reviewer accepted the listing. It is not a warranty or endorsement. Inspect third-party instructions and permissions before use.</div>
    </main>
  );
}
