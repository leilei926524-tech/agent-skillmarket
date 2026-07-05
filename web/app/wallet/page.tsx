"use client";

import { useEffect, useReducer } from "react";
import { useDemo, useCountUp, yen } from "@/lib/demo";

function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

export default function Wallet() {
  const { state } = useDemo();
  const balance = useCountUp(state.balance);
  const lifetime = useCountUp(state.lifetime);
  const mySkill = state.skills.find((s) => s.expert === "Salehin R.");
  // this is ONE seller's wallet — only their own skill's rows belong here;
  // the full network feed lives on /console
  const myRows = state.audit.filter(
    (r) => r.kind === "invoke" && mySkill && r.skillName === mySkill.name,
  );
  // keep relative timestamps moving even when ambient is paused
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-10 w-full">
      <section className="pt-10 pb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker mb-3">
            Seller Wallet · Salehin R. <span className="text-green">✓ verified</span>
          </div>
          <h1 className="display-hero text-4xl md:text-6xl">
            Earning while
            <br />
            you sleep.
          </h1>
        </div>
        <span className="sticker rotate-[2deg]">judgment = an asset now ✦</span>
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="panel p-6 md:col-span-2">
          <div className="kicker !text-[10px] mb-2">AVAILABLE BALANCE</div>
          <div className="mono text-6xl md:text-7xl font-bold tracking-tight text-violet">
            {yen(balance)}
          </div>
          <div className="meta text-[11.5px] text-dim mt-3">
            LIFETIME {yen(lifetime)} · PAYOUT RAIL: USDC · BASE SEPOLIA
          </div>

          <div className="mt-6">
            <div className="flex justify-between meta text-[10.5px] text-dim mb-1.5">
              <span>EXPERT 85%</span>
              <span>PLATFORM 15%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden flex bg-white/60 border border-line">
              <div className="bg-green/85" style={{ width: "85%" }} />
              <div className="bg-violet/80" style={{ width: "15%" }} />
            </div>
            <div className="text-[12px] text-dim mt-2">
              We invert the expert-network split — the expert keeps 85% and owns
              the asset.
            </div>
          </div>
        </div>

        <div className="panel panel-hover p-6">
          <div className="kicker !text-[10px] mb-2">YOUR TOP SKILL</div>
          {mySkill && (
            <>
              <div className="font-bold leading-snug">{mySkill.name}</div>
              <div className="mono text-sm mt-3">
                {yen(mySkill.priceJpy)}/call · <span className="text-amber">★ {mySkill.rating}</span>
              </div>
              <div className="mono text-4xl font-bold mt-2">
                {mySkill.calls.toLocaleString()}
                <span className="text-xs text-dim font-normal ml-1">calls</span>
              </div>
              <div className="meta text-[10.5px] text-dim mt-4 leading-relaxed">
                🔒 ENCRYPTED AT REST · OUTPUTS FINGERPRINTED · ANOMALY
                RATE-LIMITS ON
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel mt-4 overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between bg-white/50">
          <span className="text-sm font-bold">Audit log</span>
          <span className="meta text-[10.5px] text-dim">
            IMMUTABLE INVOCATION → PAYMENT RECORDS
          </span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {myRows.length === 0 && (
            <div className="px-5 py-6 meta text-[11px] text-dim">
              NO SETTLEMENTS YET · PRESS [1] TO SEE AN AGENT INVOKE YOUR SKILL
            </div>
          )}
          {myRows.map((r) => (
            <div
              key={r.id}
              className="row-in px-5 py-2.5 border-b border-line/50 flex items-center gap-3 text-[12.5px] mono"
            >
              <span className="text-dim w-16 shrink-0">{timeAgo(r.ts)}</span>
              <span
                className={`chip shrink-0 ${
                  r.kind === "mint"
                    ? "bg-amber/10 text-amber border border-amber/40"
                    : "bg-violet/10 text-violet border border-violet/30"
                }`}
              >
                {r.kind === "mint" ? "skill_minted" : "skill_invoke"}
              </span>
              <span className="text-dim truncate">{r.agent}</span>
              <span className="truncate flex-1">{r.skillName}</span>
              {r.net > 0 && <span className="text-green font-bold shrink-0">+{yen(r.net)}</span>}
              <span className="text-dim/70 shrink-0 hidden md:inline">{r.tx}</span>
              <span className="chip bg-green/10 text-green border border-green/30 shrink-0">
                settled
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
