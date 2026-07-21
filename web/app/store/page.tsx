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
  const callableSkills = shown.filter((skill) => skill.delivery.callable);
  const curatedSkills = shown
    .filter((skill) => skill.provenance.listingKind === "curated")
    .sort((a, b) => {
      const riskOrder: Record<string, number> = { normal: 0, caution: 1, high: 2 };
      return (riskOrder[a.risk.level] ?? 3) - (riskOrder[b.risk.level] ?? 3) || a.title.localeCompare(b.title);
    });
  const isZh = locale === "zh-CN";
  const card = (skill: PublicSkill) => {
    const curated = skill.provenance.listingKind === "curated";
    const sourceCommit = skill.provenance.source?.commit?.slice(0, 7);
    const versionLabel = skill.version.startsWith("git-") ? skill.version : `v${skill.version}`;
    return (
      <Link key={skill.id} href={`/skill?slug=${encodeURIComponent(skill.slug)}`} className="panel panel-hover p-5 flex flex-col gap-4 min-h-[290px]">
        <div className="flex justify-between gap-3">
          <div>
            <div className="kicker !text-[9px] mb-2">{skill.category}</div>
            <h2 className="font-bold text-lg leading-snug">{skill.title}</h2>
          </div>
          <span className={`chip border h-fit ${skill.risk.level === "normal" ? "text-green border-green/30 bg-green/10" : "text-amber border-amber/40 bg-amber/10"}`}>
            {skill.risk.level === "normal" ? t("common.risk.normal") : skill.risk.level === "high" ? t("common.risk.high") : t("common.risk.caution")}
          </span>
        </div>
        <p className="text-sm text-dim leading-relaxed">{skill.description}</p>
        <div className="flex flex-wrap gap-1.5">{skill.tags.slice(0, 4).map((tag) => <span key={tag} className="chip bg-white/50 border border-line text-[10px]">{tag}</span>)}</div>
        <div className="mt-auto pt-4 border-t border-line/70 flex items-end justify-between gap-4">
          <div>
            {curated ? (
              <div className="mono text-lg font-bold">{isZh ? "免费 · 查看源码" : "Free · view source"}</div>
            ) : (
              <div className="mono text-2xl font-bold">{usd(skill.price.amount)}<span className="text-xs text-dim font-normal"> {t("store.perInvoke")}</span></div>
            )}
            <div className="meta text-[9px] text-dim mt-1">{skill.publisher} · {versionLabel}</div>
          </div>
          <div className="meta text-[10px] text-right">
            <span className="text-violet">{curated ? (isZh ? "GOKUI 精选" : "GOKUI curated") : "X402"}</span><br />
            {curated ? (sourceCommit ? `commit ${sourceCommit}` : (isZh ? "固定上游版本" : "pinned upstream")) : `${skill.invokes} ${t("store.settled")}`}
          </div>
        </div>
      </Link>
    );
  };
  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-10 w-full">
      <section className="pt-10 pb-8 flex flex-wrap items-end justify-between gap-6">
        <div><div className="kicker mb-3">{t("store.kicker")}</div><h1 className="display-hero text-4xl md:text-6xl">{t("store.hero1")}<br />{t("store.hero2")}</h1></div>
        <div className="max-w-md w-full"><label className="kicker !text-[9px]" htmlFor="skill-search">{t("store.searchLabel")}</label><input id="skill-search" className="field mt-2" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("store.searchPlaceholder")} /></div>
      </section>
      {loading && <div className="panel p-8 mono text-sm" role="status">{t("store.loading")}</div>}
      {error && <div className="error-box" role="alert">{t("common.requestFailed")}</div>}
      {!loading && !error && shown.length === 0 && <div className="panel p-8"><p>{t("store.empty")}</p><Link href="/submit" className="btn-ink mt-5">{t("store.submitMissing")}</Link></div>}
      {callableSkills.length > 0 && <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{callableSkills.map(card)}</div>}
      {curatedSkills.length > 0 && (
        <section className="mt-12" aria-labelledby="curated-skills-title">
          <div className="flex flex-wrap items-end justify-between gap-5 mb-5">
            <div>
              <div className="kicker mb-2">{isZh ? "固定版本 · 免费查看" : "Pinned versions · free to inspect"}</div>
              <h2 id="curated-skills-title" className="display-hero text-3xl md:text-5xl">{isZh ? "GOKUI 社区精选" : "GOKUI community picks"}</h2>
            </div>
            <p className="max-w-xl text-sm text-dim leading-relaxed">
              {isZh
                ? "这些 Skill 由 GOKUI 从可信上游筛选并固定到已审版本。原作者没有在 GOKUI 入驻；我们不代售内容，点击后直接查看上游源码、许可证和完整安装包。"
                : "GOKUI selected these skills from trusted upstream repositories and pinned the reviewed versions. Their authors have not claimed these listings; GOKUI does not resell the packages, and each listing opens the original source and license."}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{curatedSkills.map(card)}</div>
        </section>
      )}
      <div className="panel p-5 mt-6 text-sm leading-relaxed"><b>{t("store.approvedTitle")}</b> {t("store.approvedBody")}</div>
    </main>
  );
}
