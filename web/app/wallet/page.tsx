"use client";

import Link from "next/link";
import { useI18n, type TranslationKey } from "@/lib/i18n";

const STEPS = [
  { n: "01", title: "wallet.step.challenge", body: "wallet.step.challengeBody" },
  { n: "02", title: "wallet.step.sign", body: "wallet.step.signBody" },
  { n: "03", title: "wallet.step.settle", body: "wallet.step.settleBody" },
] satisfies { n: string; title: TranslationKey; body: TranslationKey }[];

export default function Settlement() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-[980px] px-6 py-12 w-full">
      <div className="kicker mb-3">{t("wallet.kicker")}</div>
      <h1 className="display-hero text-4xl md:text-6xl">{t("wallet.hero1")}<br />{t("wallet.hero2")}</h1>
      <div className="grid md:grid-cols-3 gap-4 mt-10">
        {STEPS.map((item) => (
          <div className="panel p-5" key={item.n}>
            <div className="mono text-4xl font-bold text-violet">{item.n}</div>
            <h2 className="font-bold mt-4">{t(item.title)}</h2>
            <p className="text-sm text-dim leading-relaxed mt-2">{t(item.body)}</p>
          </div>
        ))}
      </div>
      <div className="panel p-6 mt-4">
        <b>{t("wallet.splitTitle")}</b>
        <p className="text-sm text-dim leading-relaxed mt-3">{t("wallet.splitBody")}</p>
        <div className="flex flex-wrap gap-3 mt-5">
          <Link href="/agents" className="btn-ink">{t("wallet.connect")}</Link>
          <Link href="/console" className="btn-outline">{t("wallet.activity")}</Link>
        </div>
      </div>
    </main>
  );
}
