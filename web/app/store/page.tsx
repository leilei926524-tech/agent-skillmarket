"use client";

import Link from "next/link";
import { useDemo, yen, HERO_ANSWER, GAP_QUERY } from "@/lib/demo";
import type { Skill, HumanTaskStatus } from "@/lib/demo";

function SkillCard({ s, hero, invoking, answerShown }: {
  s: Skill;
  hero?: boolean;
  invoking?: boolean;
  answerShown?: boolean;
}) {
  const inner = (
    <div
      className={`panel p-5 flex flex-col gap-3 relative overflow-hidden h-full ${
        hero ? "!border-violet/60" : "panel-hover"
      } ${invoking ? "invoking !border-violet" : ""} ${s.isNew ? "!border-amber/70" : ""}`}
    >
      {s.isNew && (
        <span className="absolute top-3 right-3 sticker !rotate-[3deg] text-amber !text-[10.5px] !py-1">
          NEW ✦ minted from task #217
        </span>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold leading-snug text-[15.5px]">{s.name}</div>
          <div className="meta text-[11px] text-dim mt-1.5">
            {s.expert}{" "}
            {s.verified && <span className="text-green">✓ VERIFIED</span>} ·{" "}
            {s.category.toUpperCase()}
          </div>
        </div>
        {!s.isNew && (
          <span className="chip bg-violet/10 text-violet border border-violet/30 shrink-0">
            🔒 encrypted
          </span>
        )}
      </div>

      <p className="text-[13px] text-dim leading-relaxed">{s.blurb}</p>

      <div className="mt-auto flex items-center gap-4 text-xs pt-2 border-t border-line/60">
        <span className="mono text-lg font-bold">
          {yen(s.priceJpy)}
          <span className="text-dim text-[11px] font-normal">/call</span>
        </span>
        <span className="mono text-amber font-semibold">★ {s.rating.toFixed(1)}</span>
        <span className="mono text-dim">{s.calls.toLocaleString()} calls</span>
        {hero ? (
          <Link
            href={`/skill/${s.id}`}
            className="ml-auto meta text-[10px] text-violet underline underline-offset-2 hover:text-foreground"
          >
            VIEW DETAIL →
          </Link>
        ) : (
          <span className="ml-auto meta text-[10px] text-dim">INSTANT · MCP</span>
        )}
      </div>

      {hero && invoking && (
        <div className="absolute inset-0 grid place-items-center bg-white/85 backdrop-blur-[1px]">
          <div className="text-center">
            <div className="mono text-violet text-sm font-bold">
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
          <div className="meta text-[10.5px] text-green mb-1.5">
            ● JUDGMENT RETURNED · LOGIC STAYS ENCRYPTED · OUTPUT FINGERPRINTED
          </div>
          <p className="text-[14px] leading-relaxed type-in font-medium">{HERO_ANSWER}</p>
          <div className="meta text-[10.5px] text-dim mt-2">
            EXPERT +{yen(Math.round(s.priceJpy * 0.85))} · PLATFORM{" "}
            {yen(s.priceJpy - Math.round(s.priceJpy * 0.85))} · BASE SEPOLIA
          </div>
        </div>
      )}
    </div>
  );
  return hero ? (
    <div className="md:col-span-2">{inner}</div>
  ) : (
    <Link href={`/skill/${s.id}`} className="block h-full">{inner}</Link>
  );
}

const PIPE: { key: HumanTaskStatus; label: string }[] = [
  { key: "gap", label: "capability gap detected" },
  { key: "matched", label: "verified expert matched" },
  { key: "offer_sent", label: "task offer emailed (opt-in)" },
  { key: "accepted", label: "accepted by expert" },
  { key: "delivered", label: "delivered → skill draft" },
];

function HumanFallback() {
  const { state } = useDemo();
  const st = state.humanTask;
  const minted = state.skills.some((k) => k.id === "s7");
  if (st === "hidden") return null;
  const idx = PIPE.findIndex((x) => x.key === st);

  return (
    <div className="panel !border-amber/60 p-5 mt-6">
      <div className="flex items-center gap-2 text-sm font-bold">
        <span className="w-2 h-2 rounded-full bg-amber live-dot" />
        No skill found — hiring a verified human
      </div>
      <p className="mono text-[12.5px] text-dim mt-2">query: “{GAP_QUERY}”</p>

      <div className="flex flex-wrap gap-2 mt-4">
        {PIPE.map((s, i) => {
          const done = i < idx || (i === idx && st === "delivered");
          return (
            <span
              key={s.key}
              className={`chip border ${
                done
                  ? "bg-green/10 text-green border-green/30"
                  : i === idx
                    ? "bg-amber/10 text-amber border-amber/40"
                    : "bg-white/40 text-dim/60 border-line"
              }`}
            >
              {done ? "✓ " : ""}
              {s.label}
            </span>
          );
        })}
      </div>

      {idx >= 1 && (
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="text-[13px]">
            <div className="kicker !text-[9.5px] mb-1">MATCHED EXPERT</div>
            <div className="font-bold">
              K. Watanabe <span className="text-green text-xs">✓ verified</span>
            </div>
            <div className="text-dim text-xs">
              JP commercial compliance · 18 yrs · opt-in to agent offers
            </div>
          </div>
          {idx >= 2 && (
            <div className="mono text-[11.5px] text-foreground/80 border border-line rounded-lg p-3 bg-white/70">
              <div className="font-bold">to: k.watanabe@…(registered)</div>
              <div>subject: [ExpertOS task #217] 取適法 payment-terms review</div>
              <div>scope: promissory-note clause legality · deadline 16:00</div>
              <div>offer: ¥15,000 · output: guardrail memo</div>
            </div>
          )}
        </div>
      )}
      {st === "delivered" && (
        <div className="mono text-[12px] text-green mt-3 font-bold">
          {minted ? (
            <>✓ minted → see the 取適法 skill in the grid · <Link href="/skill/s7" className="underline">detail</Link></>
          ) : (
            <>✓ delivered · press 3 — expert approves → task becomes an encrypted skill</>
          )}
        </div>
      )}
    </div>
  );
}

export default function Store() {
  const { state } = useDemo();
  const heroSkill =
    state.skills.find((s) => s.id === "s1") ?? state.skills[0];
  const rest = state.skills.filter((s) => s.id !== heroSkill.id);

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-10 w-full">
      <section className="pt-10 pb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker mb-3">Skill Store · pay per call</div>
          <h1 className="display-hero text-4xl md:text-6xl">
            Encrypted judgment,
            <br />
            callable by agents.
          </h1>
        </div>
        <div className="meta text-[11px] text-dim text-right">
          {state.skills.length} SKILLS ·{" "}
          {state.skills.reduce((a, s) => a + s.calls, 0).toLocaleString()} CALLS
          <br />
          LOGIC STAYS ENCRYPTED · EXTRACTION DETECTABLE
        </div>
      </section>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        <SkillCard
          s={heroSkill}
          hero
          invoking={state.invoking}
          answerShown={state.answerShown}
        />
        {rest.map((s) => (
          <SkillCard key={s.id} s={s} />
        ))}
      </div>

      <HumanFallback />
    </main>
  );
}
