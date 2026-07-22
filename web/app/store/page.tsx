"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, PublicSkill, usd } from "@/lib/live";
import { useI18n } from "@/lib/i18n";

function RiskPip({ level }: { level: string }) {
  if (level === "normal") return (
    <span className="badge" style={{ background: "rgba(61,220,151,0.1)", color: "var(--success)", borderColor: "rgba(61,220,151,0.25)" }}>
      ✓ Low risk
    </span>
  );
  if (level === "caution") return (
    <span className="badge" style={{ background: "rgba(245,181,68,0.1)", color: "var(--warning)", borderColor: "rgba(245,181,68,0.25)" }}>
      ⚠ Caution
    </span>
  );
  return (
    <span className="badge" style={{ background: "rgba(242,109,109,0.1)", color: "var(--danger)", borderColor: "rgba(242,109,109,0.25)" }}>
      ✕ High risk
    </span>
  );
}

function SkillCard({ skill }: { skill: PublicSkill }) {
  const curated = skill.provenance.listingKind === "curated";
  const sourceCommit = skill.provenance.source?.commit?.slice(0, 7);
  return (
    <Link
      href={`/skill?slug=${encodeURIComponent(skill.slug)}`}
      className="card card-hover p-5 flex flex-col gap-3.5 min-h-[230px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="kicker !text-[9px] !tracking-[0.16em] truncate">{skill.category}</div>
        <RiskPip level={skill.risk.level} />
      </div>
      <div className="font-semibold text-[15px] leading-snug">{skill.title}</div>
      <p className="text-[12.5px] leading-relaxed line-clamp-2" style={{ color: "var(--muted)" }}>{skill.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {skill.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="badge !px-2 !py-0.5 !text-[10px]" style={{ color: "var(--text-secondary)" }}>{tag}</span>
        ))}
      </div>
      <div className="mt-auto pt-3.5 border-t flex items-end justify-between gap-4" style={{ borderColor: "var(--border)" }}>
        <div>
          {curated ? (
            <div className="mono text-[13px] font-semibold" style={{ color: "var(--success)" }}>Free · open source</div>
          ) : (
            <div className="mono text-[18px] font-bold">{usd(skill.price.amount)}
              <span className="text-[10.5px] font-normal ml-1" style={{ color: "var(--muted)" }}>/call</span>
            </div>
          )}
          <div className="kicker !text-[9px] !tracking-[0.12em] mt-1">{skill.publisher} · v{skill.version}</div>
        </div>
        <div className="text-right">
          <div className="kicker !text-[9px] !tracking-[0.12em]" style={{ color: curated ? "var(--muted)" : "var(--accent)" }}>
            {curated ? "GOKUI curated" : "x402 · USDC"}
          </div>
          <div className="mono text-[10px] mt-0.5" style={{ color: "var(--muted)" }}>
            {curated ? (sourceCommit ? `commit ${sourceCommit}` : "pinned upstream") : `${skill.invokes} settled`}
          </div>
        </div>
      </div>
    </Link>
  );
}

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

  const callable = shown.filter((s) => s.delivery.callable);
  const curated = shown.filter((s) => s.provenance.listingKind === "curated");

  return (
    <main className="px-6 pb-12 max-w-5xl mx-auto w-full">
      {/* Hero */}
      <section className="pt-10 pb-8">
        <div className="kicker mb-3">{t("store.kicker")}</div>
        <h1 className="display text-3xl md:text-5xl mb-2">
          {t("store.hero1")}&nbsp;<span className="grad-text">{t("store.hero2")}</span>
        </h1>
        <p className="text-[14px] mt-3 max-w-lg" style={{ color: "var(--muted)" }}>
          {locale === "zh-CN"
            ? "购买和调用由专家发布的 AI Skill，通过 x402 协议按次付款，USDC 直达。"
            : "Browse and invoke expert-published skills. Each call settles instantly in USDC via the x402 protocol."}
        </p>
      </section>

      {/* Search */}
      <div className="mb-8 max-w-md">
        <label className="kicker !text-[9px] block mb-2" htmlFor="skill-search">{t("store.searchLabel")}</label>
        <input
          id="skill-search"
          className="field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("store.searchPlaceholder")}
        />
      </div>

      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-[230px] shimmer" />
          ))}
        </div>
      )}
      {error && <div className="error-box">{t("common.requestFailed")}</div>}

      {!loading && !error && shown.length === 0 && (
        <div className="card p-8 text-center">
          <p style={{ color: "var(--muted)" }}>{t("store.empty")}</p>
          <Link href="/submit" className="btn btn-primary mt-5 inline-flex">{t("store.submitMissing")}</Link>
        </div>
      )}

      {/* Paid skills */}
      {callable.length > 0 && (
        <section className="mb-10">
          <div className="kicker mb-4">{locale === "zh-CN" ? "付费 API · x402 结算" : "Paid API · x402 settlement"}</div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {callable.map((s) => <SkillCard key={s.id} skill={s} />)}
          </div>
        </section>
      )}

      {/* Curated skills */}
      {curated.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
            <div>
              <div className="kicker mb-2">{locale === "zh-CN" ? "固定版本 · 免费查看" : "Pinned versions · free to inspect"}</div>
              <h2 className="display text-2xl md:text-3xl">{locale === "zh-CN" ? "GOKUI 社区精选" : "Community picks"}</h2>
            </div>
            <p className="text-[12.5px] max-w-sm" style={{ color: "var(--muted)" }}>
              {locale === "zh-CN"
                ? "由 GOKUI 从可信上游筛选并固定到已审版本，直接查看源码。"
                : "GOKUI-reviewed picks pinned to audited upstream versions. No resale — click to view source."}
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {curated.map((s) => <SkillCard key={s.id} skill={s} />)}
          </div>
        </section>
      )}
    </main>
  );
}
