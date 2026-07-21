"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/live";
import { useI18n, type TranslationKey } from "@/lib/i18n";

type Stats = { skills: number; submissions: number; settledInvocations: number; network: string; mode: string };

const STEPS = [
  { n: "01", title: "home.step.submit.title", body: "home.step.submit.body" },
  { n: "02", title: "home.step.discover.title", body: "home.step.discover.body" },
  { n: "03", title: "home.step.pay.title", body: "home.step.pay.body" },
] satisfies { n: string; title: TranslationKey; body: TranslationKey }[];

export default function Landing() {
  const [stats, setStats] = useState<Stats | null>(null);
  const { t } = useI18n();
  useEffect(() => { api<Stats>("/api/v1/public/stats").then(setStats).catch(() => setStats(null)); }, []);
  return (
    <main>
      <section className="mx-auto max-w-[1360px] px-6 pt-12 md:pt-16 pb-12 relative">
        <div className="flex flex-wrap gap-6 justify-between items-start mb-10">
          <div className="kicker max-w-xs">{t("home.kicker")}</div>
          <div className="meta text-[12px] max-w-md leading-relaxed">
            {t("home.intro")}
          </div>
          <div className="meta text-[11px] text-dim lg:text-right">
            {t("home.liveOnly")}<br />{t("home.noSimulated")}
          </div>
        </div>
        <div className="relative">
          <h1 className="display-hero max-w-[1100px] break-words text-[11vw] sm:text-[9vw] md:text-[5.8rem] lg:text-[6.9rem]">
            {t("home.hero")}
          </h1>
          <div className="absolute right-[5%] top-[30%] hidden xl:block select-none">
            <div className="gel px-9 py-7 text-xl font-extrabold">HTTP 402<span className="sparkle" style={{ left: "-12px", top: "-10px" }} /></div>
          </div>
        </div>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed">
          {t("home.body")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/store" className="btn-ink">{t("home.browse")}</Link>
          <Link href="/submit" className="btn-outline">{t("home.submit")}</Link>
          <Link href="/agents" className="btn-outline">{t("home.connect")}</Link>
        </div>
      </section>

      <section className="border-y border-line bg-white/35">
        <div className="mx-auto max-w-[1360px] px-6 py-7 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { v: stats?.skills ?? "—", k: "home.stats.approved" as TranslationKey },
            { v: stats?.submissions ?? "—", k: "home.stats.submissions" as TranslationKey },
            { v: stats?.settledInvocations ?? "—", k: "home.stats.invocations" as TranslationKey },
            { v: stats?.network === "eip155:8453" ? t("common.baseMainnet") : t("common.baseSepolia"), k: "home.stats.network" as TranslationKey },
          ].map((item) => <div key={item.k}><div className="mono text-3xl md:text-4xl font-bold">{item.v}</div><div className="kicker mt-2 !text-[9px]">{t(item.k)}</div></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-6 py-14">
        <div className="kicker mb-8">{t("home.loop")}</div>
        <div className="grid md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.n} className={`py-6 md:px-8 ${index ? "border-t md:border-t-0 md:border-l border-line" : "md:pl-0"}`}>
              <span className="mono text-5xl font-bold text-violet">{step.n}</span>
              <h2 className="display-hero text-2xl mt-4">{t(step.title)}</h2>
              <p className="text-sm leading-relaxed mt-3 text-foreground/85">{t(step.body)}</p>
            </div>
          ))}
        </div>
        <div className="panel mt-10 p-5 md:p-7 flex flex-wrap gap-6 items-center justify-between">
          <div><div className="kicker !text-[9px] mb-2">{t("home.trust.title")}</div><p className="max-w-3xl text-sm leading-relaxed">{t("home.trust.body")}</p></div>
          <Link href="/.well-known/agent-skills.json" className="btn-outline mono text-xs">{t("home.manifest")}</Link>
        </div>
      </section>
    </main>
  );
}
