"use client";

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

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 w-full">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Seller Wallet</h1>
          <p className="text-dim text-sm mt-1">
            Salehin R. <span className="text-green text-xs">✓ verified expert</span> ·
            every invocation settles to an auditable on-chain record.
          </p>
        </div>
        <span className="chip bg-green/10 text-green border border-green/25">
          <span className="w-1.5 h-1.5 rounded-full bg-green live-dot" />
          earning while you sleep
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="panel p-6 md:col-span-2">
          <div className="text-xs text-dim mb-1">available balance</div>
          <div className="mono text-5xl font-bold tracking-tight text-green">
            {yen(balance)}
          </div>
          <div className="mono text-xs text-dim mt-2">
            lifetime earnings {yen(lifetime)} · payout rail: USDC · Base Sepolia
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-[11px] mono text-dim mb-1">
              <span>expert 85%</span>
              <span>platform 15%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex bg-white/5">
              <div className="bg-green/80" style={{ width: "85%" }} />
              <div className="bg-violet/70" style={{ width: "15%" }} />
            </div>
            <div className="text-[11px] text-dim mt-2">
              We invert the expert-network split — the expert keeps 85% and owns
              the asset.
            </div>
          </div>
        </div>

        <div className="panel p-6">
          <div className="text-xs text-dim mb-2">your top skill</div>
          {mySkill && (
            <>
              <div className="font-medium leading-snug">{mySkill.name}</div>
              <div className="mono text-sm mt-3">
                {yen(mySkill.priceJpy)}/call · ★ {mySkill.rating}
              </div>
              <div className="mono text-3xl font-bold mt-2">
                {mySkill.calls.toLocaleString()}
                <span className="text-xs text-dim font-normal ml-1">calls</span>
              </div>
              <div className="text-[11px] text-dim mt-3">
                🔒 encrypted at rest · outputs fingerprinted · anomaly
                rate-limits on
              </div>
            </>
          )}
        </div>
      </div>

      <div className="panel mt-4 overflow-hidden">
        <div className="px-5 py-3 border-b border-line flex items-center justify-between">
          <span className="text-sm font-semibold">Audit log</span>
          <span className="mono text-[11px] text-dim">
            immutable invocation → payment records
          </span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {state.audit.map((r) => (
            <div
              key={r.id}
              className="row-in px-5 py-2.5 border-b border-line/50 flex items-center gap-3 text-[12.5px] mono"
            >
              <span className="text-dim w-16 shrink-0">{timeAgo(r.ts)}</span>
              <span
                className={`chip shrink-0 ${
                  r.kind === "mint"
                    ? "bg-amber/15 text-amber border border-amber/30"
                    : "bg-violet/10 text-violet border border-violet/25"
                }`}
              >
                {r.kind === "mint" ? "skill_minted" : "skill_invoke"}
              </span>
              <span className="text-dim truncate">{r.agent}</span>
              <span className="truncate flex-1">{r.skillName}</span>
              {r.net > 0 && (
                <span className="text-green shrink-0">+{yen(r.net)}</span>
              )}
              <span className="text-dim/70 shrink-0 hidden md:inline">{r.tx}</span>
              <span className="chip bg-green/10 text-green border border-green/20 shrink-0">
                settled
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
