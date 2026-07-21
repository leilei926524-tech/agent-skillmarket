"use client";

import { useEffect, useState } from "react";
import { api, usd } from "@/lib/live";
import { useI18n, type TranslationKey } from "@/lib/i18n";

type Row = { id: string; tx_hash?: string; network: string; amount_usd: string; status: string; created_at: string; skill_slug: string; skill_title: string; agent_prefix: string };
type Stats = { skills: number; submissions: number; settledInvocations: number; network: string; mode: string };

export default function Activity() {
  const { locale, t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api<{ activity: Row[] }>("/api/v1/public/activity"), api<Stats>("/api/v1/public/stats")])
      .then(([activity, current]) => { setRows(activity.activity); setStats(current); })
      .catch((err) => setError(err.message));
  }, []);

  const counters: { k: TranslationKey; v: number | string }[] = [
    { k: "common.skills", v: stats?.skills ?? "—" },
    { k: "common.submissions", v: stats?.submissions ?? "—" },
    { k: "common.settled", v: stats?.settledInvocations ?? "—" },
  ];

  return (
    <main className="mx-auto max-w-[1180px] px-6 pb-12 w-full">
      <section className="pt-10 pb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker mb-3">{t("console.kicker")}</div>
          <h1 className="display-hero text-4xl md:text-6xl">{t("console.hero1")}<br />{t("console.hero2")}</h1>
        </div>
        <div className="meta text-[10px] text-dim text-right">
          {stats?.network === "eip155:8453" ? t("common.baseMainnet") : t("common.baseSepolia")}<br />
          {stats?.settledInvocations ?? "—"} {t("common.settled")}
        </div>
      </section>
      {error && <div className="error-box">{error}</div>}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {counters.map((item) => <div className="panel p-5" key={item.k}><div className="mono text-3xl font-bold">{item.v}</div><div className="kicker !text-[8px] mt-2">{t(item.k)}</div></div>)}
      </div>
      <div className="panel overflow-hidden">
        <div className="px-5 py-3 border-b border-line bg-white/50 flex justify-between"><b>{t("console.settlementActivity")}</b><span className="meta text-[9px] text-dim">{t("console.records")}</span></div>
        {rows.length === 0 ? (
          <div className="p-8 text-sm text-dim">{t("console.empty")}</div>
        ) : rows.map((row) => (
          <div key={row.id} className="px-5 py-4 border-b border-line/60 grid md:grid-cols-[160px_1fr_110px_170px] gap-3 text-xs items-center">
            <span className="mono text-dim">{new Date(row.created_at).toLocaleString(locale)}</span>
            <div><b>{row.skill_title}</b><div className="mono text-dim mt-1">{row.agent_prefix}…</div></div>
            <span className="mono font-bold text-green">{usd(row.amount_usd)}</span>
            <span className="mono text-dim break-all">{row.tx_hash || t("console.receiptPending")}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-dim mt-4">{t("console.disclaimer")}</p>
    </main>
  );
}
