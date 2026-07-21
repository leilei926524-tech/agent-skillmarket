"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, PublicSkill, usd } from "@/lib/live";
import { useI18n } from "@/lib/i18n";

export default function Store() {
  const { locale, t } = useI18n();
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
    if (!q) return skills;
    const aliases = locale === "zh-CN"
      ? [
          [/定价|价格|折扣/, "pricing discount"],
          [/风控|安全|注入/, "security prompt-injection triage"],
          [/发票|开票|跨境账单/, "invoice cross-border finance"],
        ].filter(([pattern]) => (pattern as RegExp).test(q)).flatMap(([, terms]) => String(terms).split(" "))
      : [];
    const needles = [q, ...aliases];
    return skills.filter((skill) => {
      const haystack = `${skill.title} ${skill.description} ${skill.category} ${skill.tags.join(" ")}`.toLowerCase();
      return needles.some((needle) => haystack.includes(needle));
    });
  }, [locale, query, skills]);
  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-10 w-full">
      <section className="pt-10 pb-8 flex flex-wrap items-end justify-between gap-6">
        <div><div className="kicker mb-3">{t("store.kicker")}</div><h1 className="display-hero text-4xl md:text-6xl">{t("store.hero1")}<br />{t("store.hero2")}</h1></div>
        <div className="max-w-md w-full"><label className="kicker !text-[9px]" htmlFor="skill-search">{t("store.searchLabel")}</label><input id="skill-search" className="field mt-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("store.searchPlaceholder")} /></div>
      </section>
      {loading && <div className="panel p-8 mono text-sm" role="status">{t("store.loading")}</div>}
      {error && <div className="error-box" role="alert">{t("common.requestFailed")}</div>}
      {!loading && !error && shown.length === 0 && <div className="panel p-8"><p>{t("store.empty")}</p><Link href="/submit" className="btn-ink mt-5">{t("store.submitMissing")}</Link></div>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((skill) => (
          <Link key={skill.id} href={`/skill?slug=${encodeURIComponent(skill.slug)}`} className="panel panel-hover p-5 flex flex-col gap-4 min-h-[290px]">
            <div className="flex justify-between gap-3"><div><div className="kicker !text-[9px] mb-2">{skill.category}</div><h2 className="font-bold text-lg leading-snug">{skill.title}</h2></div><span className={`chip border h-fit ${skill.risk.level === "normal" ? "text-green border-green/30 bg-green/10" : "text-amber border-amber/40 bg-amber/10"}`}>{skill.risk.level === "normal" ? t("common.risk.normal") : skill.risk.level === "high" ? t("common.risk.high") : t("common.risk.caution")}</span></div>
            <p className="text-sm text-dim leading-relaxed">{skill.description}</p>
            <div className="flex flex-wrap gap-1.5">{skill.tags.slice(0, 4).map((tag) => <span key={tag} className="chip bg-white/50 border border-line text-[10px]">{tag}</span>)}</div>
            <div className="mt-auto pt-4 border-t border-line/70 flex items-end justify-between gap-4"><div><div className="mono text-2xl font-bold">{usd(skill.price.amount)}<span className="text-xs text-dim font-normal"> {t("store.perInvoke")}</span></div><div className="meta text-[9px] text-dim mt-1">{skill.publisher} · v{skill.version}</div></div><div className="meta text-[10px] text-right"><span className="text-violet">X402</span><br />{skill.invokes} {t("store.settled")}</div></div>
          </Link>
        ))}
      </div>
      <div className="panel p-5 mt-6 text-sm leading-relaxed"><b>{t("store.approvedTitle")}</b> {t("store.approvedBody")}</div>
    </main>
  );
}
