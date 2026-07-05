"use client";

import { useDemo, yen, HERO_ANSWER, GAP_QUERY } from "@/lib/demo";
import type { Skill, HumanTaskStatus } from "@/lib/demo";

function Stars({ r }: { r: number }) {
  return (
    <span className="text-amber text-xs mono">
      ★ {r.toFixed(1)}
    </span>
  );
}

function SkillCard({ s, hero, invoking, answerShown }: {
  s: Skill;
  hero?: boolean;
  invoking?: boolean;
  answerShown?: boolean;
}) {
  return (
    <div
      className={`panel p-5 flex flex-col gap-3 relative overflow-hidden transition-all ${
        hero ? "md:col-span-2 border-violet/30" : ""
      } ${invoking ? "invoking border-violet" : ""} ${
        s.isNew ? "border-amber/40" : ""
      }`}
    >
      {s.isNew && (
        <span className="absolute top-0 right-0 chip bg-amber/15 text-amber border border-amber/30 rounded-none rounded-bl-xl">
          NEW · {s.minted}
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold leading-snug">{s.name}</div>
          <div className="text-xs text-dim mt-1">
            {s.expert}{" "}
            {s.verified && (
              <span className="text-green" title="verified expert">✓ verified</span>
            )}{" "}
            · {s.category}
          </div>
        </div>
        <span className="chip bg-violet/10 text-violet border border-violet/25 shrink-0">
          🔒 encrypted
        </span>
      </div>

      <p className="text-[13px] text-dim leading-relaxed">{s.blurb}</p>

      <div className="mt-auto flex items-center gap-4 text-xs">
        <span className="mono text-base font-bold text-foreground">
          {yen(s.priceJpy)}
          <span className="text-dim text-[11px] font-normal">/call</span>
        </span>
        <Stars r={s.rating} />
        <span className="mono text-dim">{s.calls.toLocaleString()} calls</span>
        <span className="ml-auto chip bg-white/5 text-dim border border-line">
          instant · MCP
        </span>
      </div>

      {hero && invoking && (
        <div className="absolute inset-0 grid place-items-center bg-background/85 backdrop-blur-[2px]">
          <div className="text-center">
            <div className="mono text-violet text-sm">
              nego-agent-7f2e → invoke()
            </div>
            <div className="mono text-xs text-dim mt-2">
              paying {yen(s.priceJpy)} · x402 settlement · decrypting in vault…
            </div>
          </div>
        </div>
      )}

      {hero && answerShown && (
        <div className="border-t border-line pt-3 mt-1">
          <div className="mono text-[11px] text-green mb-1.5">
            ● judgment returned · logic stays encrypted · output fingerprinted
          </div>
          <p className="text-[13.5px] leading-relaxed type-in">
            {HERO_ANSWER}
          </p>
          <div className="mono text-[11px] text-dim mt-2">
            expert +{yen(Math.round(s.priceJpy * 0.85))} · platform{" "}
            {yen(s.priceJpy - Math.round(s.priceJpy * 0.85))} · settled on Base
            Sepolia
          </div>
        </div>
      )}
    </div>
  );
}

const STEPS: { key: HumanTaskStatus; label: string }[] = [
  { key: "gap", label: "capability gap detected" },
  { key: "matched", label: "verified expert matched" },
  { key: "offer_sent", label: "task offer emailed (opt-in)" },
  { key: "accepted", label: "accepted by expert" },
  { key: "delivered", label: "delivered → skill draft" },
];

function HumanFallback() {
  const { state } = useDemo();
  const st = state.humanTask;
  if (st === "hidden") return null;
  const idx = STEPS.findIndex((x) => x.key === st);

  return (
    <div className="panel border-amber/30 p-5 mt-6">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="w-2 h-2 rounded-full bg-amber live-dot" />
        No skill found — hiring a verified human
      </div>
      <p className="mono text-[12.5px] text-dim mt-2">
        query: “{GAP_QUERY}”
      </p>

      <div className="flex flex-wrap gap-2 mt-4">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={`chip border ${
              i < idx
                ? "bg-green/10 text-green border-green/25"
                : i === idx
                  ? "bg-amber/15 text-amber border-amber/35"
                  : "bg-white/3 text-dim/60 border-line"
            }`}
          >
            {i < idx ? "✓ " : ""}
            {s.label}
          </span>
        ))}
      </div>

      {idx >= 1 && (
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="text-[13px]">
            <div className="text-dim text-xs mb-1">matched expert</div>
            <div className="font-medium">
              K. Watanabe <span className="text-green text-xs">✓ verified</span>
            </div>
            <div className="text-dim text-xs">
              JP commercial compliance · 18 yrs · opt-in to agent offers
            </div>
          </div>
          {idx >= 2 && (
            <div className="mono text-[11.5px] text-dim border border-line rounded-lg p-3 bg-black/30">
              <div className="text-foreground/80">to: k.watanabe@…(registered)</div>
              <div>subject: [ExpertOS task #217] 取適法 payment-terms review</div>
              <div>scope: promissory-note clause legality · deadline 16:00</div>
              <div>offer: ¥15,000 · output: guardrail memo (approve/deny/escalate)</div>
            </div>
          )}
        </div>
      )}
      {st === "delivered" && (
        <div className="mono text-[12px] text-green mt-3">
          ✓ delivered · press 3 — expert approves → task becomes an encrypted skill
        </div>
      )}
    </div>
  );
}

export default function Store() {
  const { state } = useDemo();
  const [hero, ...rest] = state.skills[0].id === "s7" ? [state.skills[1], state.skills[0], ...state.skills.slice(2)] : state.skills;
  const cards = state.skills[0].id === "s7" ? [state.skills[0], ...state.skills.slice(2)] : rest;

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 w-full">
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Skill Store</h1>
          <p className="text-dim text-sm mt-1">
            Encrypted expert judgment, callable by agents. Pay per call — the
            logic never leaves the vault.
          </p>
        </div>
        <div className="mono text-xs text-dim">
          {state.skills.length} skills · {state.skills.reduce((a, s) => a + s.calls, 0).toLocaleString()} total calls
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkillCard
          s={hero}
          hero
          invoking={state.invoking}
          answerShown={state.answerShown}
        />
        {cards.map((s) => (
          <SkillCard key={s.id} s={s} />
        ))}
      </div>

      <HumanFallback />
    </main>
  );
}
