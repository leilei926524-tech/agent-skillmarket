"use client";

import { useEffect, useReducer } from "react";
import { useDemo, yen, GAP_QUERY } from "@/lib/demo";

function timeAgo(ts: number) {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
}

const PIPE = ["gap", "matched", "offer_sent", "accepted", "delivered"] as const;
const PIPE_LABEL: Record<(typeof PIPE)[number], string> = {
  gap: "capability gap",
  matched: "expert matched",
  offer_sent: "offer emailed",
  accepted: "accepted",
  delivered: "delivered",
};

export default function Console() {
  const { state } = useDemo();
  const maxCalls = Math.max(...state.skills.map((s) => s.calls));
  const taskIdx = PIPE.indexOf(state.humanTask as (typeof PIPE)[number]);
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
          <div className="kicker mb-3">Live console · network operations</div>
          <h1 className="display-hero text-4xl md:text-6xl">
            The market,
            <br />
            breathing.
          </h1>
        </div>
        <div className="meta text-[11px] text-dim text-right">
          AMBIENT FEED {state.ambient ? "● ON" : "○ PAUSED [P]"}
          <br />
          SETTLEMENT: BASE SEPOLIA
        </div>
      </section>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-4">
        {/* event stream */}
        <div className="panel overflow-hidden">
          <div className="px-5 py-3 border-b border-line bg-white/50 flex justify-between items-center">
            <span className="text-sm font-bold">Event stream</span>
            <span className="meta text-[10.5px] text-dim">AGENT ⇄ EXPERT SETTLEMENTS</span>
          </div>
          <div className="max-h-[480px] overflow-y-auto">
            {state.audit.map((r) => (
              <div
                key={r.id}
                className="row-in px-5 py-2.5 border-b border-line/50 flex items-center gap-3 text-[12.5px] mono"
              >
                <span className="text-dim w-16 shrink-0">{timeAgo(r.ts)}</span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${r.kind === "mint" ? "bg-amber" : "bg-violet"}`}
                />
                <span className="text-dim truncate">{r.agent}</span>
                <span className="truncate flex-1">{r.skillName}</span>
                {r.gross > 0 && <span className="shrink-0">{yen(r.gross)}</span>}
                <span className="text-dim/70 shrink-0 hidden md:inline">{r.tx}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* per-skill volume */}
          <div className="panel p-5">
            <div className="kicker !text-[10px] mb-4">CALL VOLUME BY SKILL</div>
            <div className="space-y-3">
              {state.skills.map((s) => (
                <div key={s.id}>
                  <div className="flex justify-between text-[11.5px] mono mb-1">
                    <span className="truncate mr-3">{s.name}</span>
                    <span className="text-dim shrink-0">{s.calls.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-white/60 rounded-full overflow-hidden border border-line/50">
                    <div
                      className={`h-full ${s.isNew ? "bg-amber" : "bg-violet"}`}
                      style={{ width: `${Math.max(3, (s.calls / maxCalls) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* human task pipeline */}
          <div className="panel p-5">
            <div className="kicker !text-[10px] mb-3">HUMAN FALLBACK · TASK #217</div>
            {state.humanTask === "hidden" ? (
              <div className="meta text-[11px] text-dim">
                NO OPEN TASKS · PRESS [2] TO SIMULATE A CAPABILITY GAP
              </div>
            ) : (
              <>
                <div className="mono text-[11.5px] text-dim mb-3 leading-relaxed">
                  “{GAP_QUERY.slice(0, 80)}…”
                </div>
                <div className="flex flex-col gap-1.5">
                  {PIPE.map((p, i) => {
                    const done =
                      i < taskIdx || (i === taskIdx && state.humanTask === "delivered");
                    return (
                      <div key={p} className="flex items-center gap-2 mono text-[12px]">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            done ? "bg-green" : i === taskIdx ? "bg-amber live-dot" : "bg-line"
                          }`}
                        />
                        <span className={i <= taskIdx ? "" : "text-dim/60"}>{PIPE_LABEL[p]}</span>
                        {done && <span className="text-green ml-auto">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="sticker block text-center rotate-[1.5deg]">
            every job here becomes tomorrow&apos;s skill ✦
          </div>
        </div>
      </div>
    </main>
  );
}
