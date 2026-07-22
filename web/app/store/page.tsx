"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, localizedSkill, PublicSkill, usd } from "@/lib/live";
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
    const q = query.normalize("NFKC").toLowerCase().trim();
    if (!q) return skills;
    return skills.filter((skill) => {
      const localizations = Object.values(skill.localizations || {}).flatMap((entry) => Object.values(entry));
      const haystack = `${skill.title} ${skill.description} ${skill.category} ${skill.tags.join(" ")} ${localizations.join(" ")}`
        .normalize("NFKC")
        .toLowerCase();
      const aliases = skill.searchAliases || [];
      return haystack.includes(q) || aliases.some((alias) => {
        const normalizedAlias = alias.normalize("NFKC").toLowerCase();
        return q.includes(normalizedAlias) || (q.length >= 2 && normalizedAlias.includes(q));
      });
    });
  }, [query, skills]);
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
    const display = localizedSkill(skill, locale);
    const sourceCommit = skill.provenance.source?.commit?.slice(0, 7);
    const versionLabel = skill.version.startsWith("git-") ? skill.version : `v${skill.version}`;
    return (
      <Link key={skill.id} href={`/skill?slug=${encodeURIComponent(skill.slug)}`} className="panel panel-hover p-5 flex flex-col gap-4 min-h-[290px]">
        <div className="flex justify-between gap-3">
          <div>
            <div className="kicker !text-[9px] mb-2">{display.category}</div>
            <h2 className="font-bold text-lg leading-snug">{display.title}</h2>
          </div>
          <span className={`chip border h-fit ${skill.risk.level === "normal" ? "text-green border-green/30 bg-green/10" : "text-amber border-amber/40 bg-amber/10"}`}>
            {skill.risk.level === "normal" ? t("common.risk.normal") : skill.risk.level === "high" ? t("common.risk.high") : t("common.risk.caution")}
          </span>
        </div>
        <p className="text-sm text-dim leading-relaxed">{display.description}</p>
        <div className="flex flex-wrap gap-1.5">{skill.tags.slice(0, 4).map((tag) => <span key={tag} className="chip bg-white/50 border border-line text-[10px]">{tag}</span>)}</div>
        <div className="mt-auto pt-4 border-t border-line/70 flex items-end justify-between gap-4">
          <div>
            {curated ? (
              <div className="mono text-lg font-bold">{isZh ? "免费 · 交给 AI 安装" : "Free · install with AI"}</div>
            ) : (
              <div className="mono text-2xl font-bold">{usd(skill.price.amount)}<span className="text-xs text-dim font-normal"> {t("store.perInvoke")}</span></div>
            )}
            <div className="meta text-[9px] text-dim mt-1">{skill.publisher} · {versionLabel}</div>
          </div>
          <div className="meta text-[10px] text-right">
            <span className="text-violet">{curated ? (isZh ? "ExpertOS 精选" : "ExpertOS curated") : "X402"}</span><br />
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
      <p className="sr-only" aria-live="polite">{!loading && !error ? `${shown.length} ${locale === "zh-CN" ? "个结果" : "results"}` : ""}</p>
      {loading && <div className="panel p-8 mono text-sm" role="status">{t("store.loading")}</div>}
      {error && <div className="error-box" role="alert">{t("common.requestFailed")}</div>}
      {!loading && !error && shown.length === 0 && <div className="panel p-8"><p>{t("store.empty")}</p><Link href="/submit" className="btn-ink mt-5">{t("store.submitMissing")}</Link></div>}
      {callableSkills.length > 0 && <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{callableSkills.map(card)}</div>}
      {curatedSkills.length > 0 && (
        <section className="mt-12" aria-labelledby="curated-skills-title">
          <div className="flex flex-wrap items-end justify-between gap-5 mb-5">
            <div>
              <div className="kicker mb-2">{isZh ? "固定版本 · 免费安装" : "Pinned versions · free to install"}</div>
              <h2 id="curated-skills-title" className="display-hero text-3xl md:text-5xl">{isZh ? "ExpertOS 社区精选" : "ExpertOS community picks"}</h2>
            </div>
            <p className="max-w-xl text-sm text-dim leading-relaxed">
              {isZh
                ? "这些 Skill 由 ExpertOS 从可信上游筛选并固定到已审版本。原作者没有在 ExpertOS 入驻；我们不代售内容。打开后可复制一段安全交接指令，让你的 AI 检查并安装。"
                : "ExpertOS selected these skills from trusted upstream repositories and pinned the reviewed versions. Their authors have not claimed these listings and ExpertOS does not resell them. Open one to copy a guarded handoff for your AI to inspect and install."}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{curatedSkills.map(card)}</div>
        </section>
      )}
      <div className="panel p-5 mt-6 text-sm leading-relaxed"><b>{t("store.approvedTitle")}</b> {t("store.approvedBody")}</div>
    </main>
  );
}
