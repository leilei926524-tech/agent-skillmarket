"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemo, yen, HERO_ANSWER } from "@/lib/demo";
import { Avatar } from "@/components/avatar";

/* per-skill showcase content lives OUTSIDE demo state so old persisted
   snapshots (without these fields) can never break hydration */
const SAMPLES: Record<string, { q: string; a: string; built: string }> = {
  s1: {
    q: "Customer asks 35% off for a 2-year commit. Approve?",
    a: HERO_ANSWER,
    built:
      "Built from ten years of deal-desk exceptions — approval tiers, trade conditions, escalation thresholds — packaged as a callable, fingerprinted judgment engine.",
  },
  s2: {
    q: "Enterprise customer demands a full refund 40 days after renewal. Refund, credit, or escalate?",
    a: "Past the 30-day window: no cash refund. Offer pro-rated service credit up to 60% if churn-risk score is high; escalate to CS lead only if ARR > ¥5M or legal threat is explicit.",
    built:
      "Distilled from 4,000+ resolved refund tickets: when goodwill pays back, and when it just trains customers to threaten.",
  },
  s3: {
    q: "US SaaS at $49/mo entering Japan — what price point and display?",
    a: "List at ¥6,980/月 (not a converted ¥7,350) — round to the 980 ladder. Display tax-inclusive by law (総額表示). Keep a ¥50,000+ annual tier for corporate procurement; invoice payment is non-negotiable for enterprise.",
    built:
      "Yen ladders, 総額表示 rules and channel margin norms from 12 years of pricing for the Japanese market.",
  },
  s4: {
    q: "Prospect sent a 240-question security sheet due Friday. Which need legal?",
    a: "Auto-answer the ~190 standard items from the approved bank (SOC2/ISO mappings). Flag data-residency, sub-processor liability and breach-notification SLAs for legal — those three clauses carry 90% of the negotiation risk.",
    built:
      "Answer 80% instantly, flag the 20% that bites. Trained on 300+ enterprise questionnaires.",
  },
  s5: {
    q: "Senior engineer counters with +18% over band and a competing offer. Match?",
    a: "Don't match cash beyond band ceiling. Counter at +8% base + sign-on covering the gap year-one; require the competing offer letter. If they walk on that, the market has spoken — re-level the band, don't break it once.",
    built:
      "Comp bands, sign-on limits and counter-offer plays from 500+ JP tech offers.",
  },
  s6: {
    q: "German client refuses our 適格請求書 — they want a reverse-charge invoice. Who's right?",
    a: "For B2B services to a German entity, the supply is outside JCT scope — issue a reverse-charge invoice without JCT, note '消費税対象外'. The 適格請求書 format only matters for domestic JCT credit. Keep FX date = invoice date, not payment date.",
    built:
      "Qualified-invoice traps for cross-border counterparties, from a decade of JP finance ops.",
  },
  s7: {
    q: "Can we still pay this supplier with a 90-day promissory note?",
    a: "No. Since 2026-01-01 the Toritekihō flat-out bans promissory-note payment to covered subcontractors. Switch to bank transfer ≤60 days, and you cannot deduct the transfer fee without written agreement. Unilateral price cuts without negotiation are now a named violation.",
    built:
      "Minted from completed human task #217 — reviewed and approved by K. Watanabe.",
  },
  s8: {
    q: "Spring Boot 1.5 monolith, 400k LOC, bank client wants microservices in 6 months. Realistic?",
    a: "No — and don't try. Strangle, don't rewrite: carve out the 3 highest-churn domains behind an API gateway first, leave the batch/ledger core alone (it's stable and audited), and budget 6 months for just the first slice + CI/CD spine. A full decomposition pitch is how these projects die in month 9.",
    built:
      "Migration triage judgment from a decade of bank-scale Java: what to strangle, what to rewrite, what to respectfully leave alone.",
  },
  s14: {
    q: "Series A term sheet: 1x participating preferred, 2-of-5 board with investor chair, full-ratchet anti-dilution. Sign?",
    a: "Three red flags, escalating: participating preferred is off-market post-2023 — push to 1x non-participating. Full ratchet is a walk-away unless the valuation is a gift; counter with broad-based weighted average. The board math is the killer: 2-of-5 with investor chair plus a fiduciary-duty clause is de facto control. Trade valuation for governance, never the reverse.",
    built:
      "Red-flag pattern library from 300+ venture financings on both sides of the table.",
  },
  s15: {
    q: "New ceramic substrate vendor passed the paper audit. Line trial next week — what do we actually look for?",
    a: "Ignore the cert binder. Watch three things on the floor: whether operators touch the kiln schedule manually (recipe discipline), the state of the incoming-powder storage (humidity logs, FIFO), and how they handle a lot that fails visual — if it goes back into rework without an engineer's sign-off, walk away. Ask for their last 6 months of yield Pareto, not their best quarter.",
    built:
      "Thirty years of supplier qualification instinct from Kyocera process engineering — the judgment no datasheet carries, now earning per call in retirement.",
  },
};

/* deterministic per-skill pseudo-data (no Math.random → no hydration risk) */
function seedFrom(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 997;
  return h;
}
function sparkFor(id: string) {
  const s = seedFrom(id);
  return Array.from({ length: 24 }, (_, i) => 3 + ((s * (i + 3) * 7919) % 100) / 100 * 9 + i * 0.55);
}
function hashFor(id: string) {
  const s = seedFrom(id).toString(16).padStart(3, "0");
  return `0x${s}f21c9d7…${s}e3d0`;
}

export default function SkillDetail() {
  const params = useParams<{ id: string }>();
  const { state, send } = useDemo();
  // the judge's OWN invoke on non-hero skills — local, so ambient market
  // activity can't make the button look pre-consumed; cleared on R
  const [ownPhase, setOwnPhase] = useState<"idle" | "invoking" | "settled">("idle");
  useEffect(() => setOwnPhase("idle"), [state.resets]);

  const s = state.skills.find((k) => k.id === params.id);
  const sample = SAMPLES[params.id ?? ""] ?? null;

  if (!s) {
    return (
      <main className="mx-auto max-w-[1360px] px-6 py-20 text-center">
        <div className="kicker mb-4">Registry lookup</div>
        <h1 className="display-hero text-4xl">Skill not found.</h1>
        <p className="text-dim mt-4 text-sm">
          {params.id === "s7"
            ? "This skill hasn't been minted yet — press 3 after a delivered human task, then come back."
            : "Nothing registered under this id."}
        </p>
        <Link href="/store" className="btn-ink mt-8 inline-flex">
          BACK TO STORE →
        </Link>
      </main>
    );
  }

  const isHero = s.id === "s1";
  // freshly minted skill: flat history + one live bar, matching its story
  const spark = s.isNew
    ? [...Array.from({ length: 23 }, () => 0.6), 10]
    : sparkFor(s.id);
  const max = Math.max(...spark);
  const invoking = isHero ? state.invoking : ownPhase === "invoking";
  const settled = isHero ? state.answerShown : ownPhase === "settled";

  const invoke = () => {
    if (invoking) return;
    if (isHero) {
      send({ t: "invoke_hero_start" });
      setTimeout(() => send({ t: "invoke_hero_settle" }), 1600);
    } else {
      setOwnPhase("invoking");
      setTimeout(() => {
        send({ t: "ambient", skillId: s.id, agent: "nego-agent-7f2e" });
        setOwnPhase("settled");
      }, 900);
    }
  };

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-10 w-full">
      <div className="meta text-[11px] text-dim pt-8">
        <Link href="/store" className="hover:text-violet">STORE</Link> /{" "}
        {s.name.toUpperCase().slice(0, 40)} · REGISTRY {hashFor(s.id)}
      </div>

      <section className="pt-6 pb-10 grid lg:grid-cols-[1.6fr_1fr] gap-8">
        <div>
          <div className="kicker mb-3">{s.category} · encrypted skill</div>
          <h1 className="display-hero text-4xl md:text-6xl">{s.name}</h1>
          <div className="flex items-center gap-3 mt-5">
            <Avatar id={s.id} name={s.expert} size={52} />
            <div>
              <div className="meta text-[12px]">
                {s.expert.toUpperCase()}{" "}
                <span className="text-green">✓ VERIFIED EXPERT</span>
                {isHero && <> · ON THIS TEAM TODAY</>}
                {s.isNew && <> · <span className="text-amber">MINTED TODAY FROM TASK #217</span></>}
              </div>
              <div className="text-[12.5px] text-dim mt-0.5">{s.bio}</div>
            </div>
          </div>
          <p className="text-[15px] leading-relaxed mt-5 max-w-xl text-foreground/85">
            {s.blurb} {sample?.built}
          </p>

          <div className="panel p-5 mt-8">
            <div className="flex items-baseline justify-between">
              <span className="kicker !text-[10px]">TOTAL CALLS</span>
              <span className="mono text-2xl font-bold">{s.calls.toLocaleString()}</span>
            </div>
            <div className="flex items-end gap-1.5 h-24 mt-4">
              {spark.map((v, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${i === spark.length - 1 ? "bg-violet" : "bg-violet/35"}`}
                  style={{ height: `${(v / max) * 100}%` }}
                />
              ))}
            </div>
          </div>

          {sample && (
            <div className="panel p-5 mt-4">
              <div className="kicker !text-[10px] mb-3">SAMPLE EXCHANGE</div>
              <div className="mono text-[12.5px] text-dim">agent → “{sample.q}”</div>
              <div className="text-[14px] leading-relaxed mt-3 font-medium border-l-2 border-violet pl-4">
                {sample.a}
              </div>
              <div className="meta text-[10.5px] text-green mt-3">
                OUTPUT FINGERPRINTED · DISTILLATION DETECTABLE &amp; UNPROFITABLE, BY DESIGN
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className={`panel p-6 ${invoking ? "invoking !border-violet" : ""}`}>
            <div className="flex items-baseline justify-between">
              <span className="mono text-4xl font-bold">{yen(s.priceJpy)}</span>
              <span className="meta text-[11px] text-dim">PER CALL</span>
            </div>
            <div className="meta text-[11px] text-dim mt-2">
              ★ {s.rating.toFixed(1)} · EXPERT KEEPS {yen(Math.round(s.priceJpy * 0.85))} ·
              X402 / USDC
            </div>
            <button onClick={invoke} className="btn-ink w-full justify-center mt-5">
              {invoking ? "INVOKING…" : "INVOKE AS AGENT →"}
            </button>
            {settled && (
              <div className="meta text-[10.5px] text-green mt-3">
                ● SETTLED · {yen(Math.round(s.priceJpy * 0.85))} TO {s.expert.split(" ")[0].toUpperCase()} ·
                SEE <Link href="/console" className="underline">CONSOLE</Link> / <Link href="/wallet" className="underline">WALLET</Link>
              </div>
            )}
          </div>

          <div className="panel p-5">
            <div className="kicker !text-[10px] mb-3">LICENSE · RSL 1.0 STYLE</div>
            <ul className="text-[12.5px] space-y-2 text-foreground/85">
              <li>· pay-per-inference: {yen(s.priceJpy)} / call</li>
              <li>· bulk training use: <b>collective deal only</b>, 75% vote + opt-out</li>
              <li>· redistribution of outputs: prohibited</li>
              <li>· canary + fingerprint forensics: active</li>
            </ul>
          </div>

          <div className="panel p-5">
            <div className="kicker !text-[10px] mb-3">PROVENANCE</div>
            <div className="mono text-[12px] leading-relaxed text-dim">
              salted keccak256
              <br />
              <span className="text-foreground">{hashFor(s.id)}</span>
              <br />
              registered {s.isNew ? "2026-07-05 (today)" : "2026-05-11"} · Base Sepolia
              <br />
              <a
                href="https://sepolia.basescan.org"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-violet"
              >
                view on BaseScan ↗
              </a>
            </div>
          </div>

          <div className="sticker rotate-[2deg] block text-center">
            The expert owns this asset — we just meter it ✦
          </div>
        </div>
      </section>
    </main>
  );
}
