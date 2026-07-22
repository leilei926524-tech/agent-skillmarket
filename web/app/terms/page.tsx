"use client";

import { useI18n, type TranslationKey } from "@/lib/i18n";

const SECTIONS = [
  ["terms.betaTitle", "terms.betaBody"],
  ["terms.skillsTitle", "terms.skillsBody"],
  ["terms.agentsTitle", "terms.agentsBody"],
  ["terms.paymentsTitle", "terms.paymentsBody"],
  ["terms.prohibitedTitle", "terms.prohibitedBody"],
  ["terms.limitsTitle", "terms.limitsBody"],
] satisfies [TranslationKey, TranslationKey][];

export default function Terms() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-[920px] px-6 py-12 w-full">
      <div className="kicker mb-3">{t("terms.kicker")}</div>
      <h1 className="display-hero text-4xl md:text-6xl">{t("terms.title")}</h1>
      <p className="meta text-[10px] text-dim mt-5">{t("terms.updated")}</p>
      <p className="mt-6 text-lg leading-relaxed max-w-3xl">{t("terms.intro")}</p>
      <div className="mt-10 grid gap-4">
        {SECTIONS.map(([title, body]) => (
          <section className="panel p-6" key={title}>
            <h2 className="text-xl font-bold">{t(title)}</h2>
            <p className="text-sm text-dim leading-7 mt-3">{t(body)}</p>
          </section>
        ))}
      </div>
      <a className="btn-outline mt-6" href="https://github.com/leilei926524-tech/agent-skillmarket/security/advisories/new" target="_blank" rel="noreferrer" aria-label={`${t("terms.contact")} (opens in a new tab)`}>{t("terms.contact")}</a>
    </main>
  );
}
