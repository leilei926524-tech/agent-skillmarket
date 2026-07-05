"use client";

import Link from "next/link";
import { useDemo, yen, HERO_ANSWER } from "@/lib/demo";

const SPARK = [3, 5, 4, 7, 6, 9, 8, 11, 9, 13, 12, 15, 13, 17, 16, 21, 18, 24, 22, 27, 25, 31, 28, 34];

export default function SkillDetail() {
  const { state, send } = useDemo();
  const s = state.skills.find((k) => k.id === "s1") ?? state.skills[0];

  const invoke = () => {
    send({ t: "invoke_hero_start" });
    setTimeout(() => send({ t: "invoke_hero_settle" }), 1600);
  };

  return (
    <main className="mx-auto max-w-[1360px] px-6 pb-10 w-full">
      <div className="meta text-[11px] text-dim pt-8">
        <Link href="/store" className="hover:text-violet">STORE</Link> / SKILL[01] ·
        REGISTRY 0x8a4f…e3d0
      </div>

      <section className="pt-6 pb-10 grid lg:grid-cols-[1.6fr_1fr] gap-8">
        {/* left: identity + evidence */}
        <div>
          <div className="kicker mb-3">{s.category} · encrypted skill</div>
          <h1 className="display-hero text-4xl md:text-6xl">{s.name}</h1>
          <div className="meta text-[12px] mt-4">
            BY {s.expert.toUpperCase()}{" "}
            <span className="text-green">✓ VERIFIED EXPERT</span> · ON THIS TEAM
            TODAY
          </div>
          <p className="text-[15px] leading-relaxed mt-5 max-w-xl text-foreground/85">
            {s.blurb} Built from ten years of deal-desk exceptions — approval
            tiers, trade conditions, escalation thresholds — packaged as a
            callable, fingerprinted judgment engine.
          </p>

          {/* call volume sparkline */}
          <div className="panel p-5 mt-8">
            <div className="flex items-baseline justify-between">
              <span className="kicker !text-[10px]">CALLS · LAST 24 DAYS</span>
              <span className="mono text-2xl font-bold">{s.calls.toLocaleString()}</span>
            </div>
            <div className="flex items-end gap-1.5 h-24 mt-4">
              {SPARK.map((v, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-sm ${i === SPARK.length - 1 ? "bg-violet" : "bg-violet/35"}`}
                  style={{ height: `${(v / 34) * 100}%` }}
                />
              ))}
            </div>
          </div>

          {/* sample exchange */}
          <div className="panel p-5 mt-4">
            <div className="kicker !text-[10px] mb-3">SAMPLE EXCHANGE</div>
            <div className="mono text-[12.5px] text-dim">
              agent → “Customer asks 35% off for a 2-year commit. Approve?”
            </div>
            <div className="text-[14px] leading-relaxed mt-3 font-medium border-l-2 border-violet pl-4">
              {HERO_ANSWER}
            </div>
            <div className="meta text-[10.5px] text-green mt-3">
              OUTPUT FINGERPRINTED · DISTILLATION DETECTABLE &amp; UNPROFITABLE, BY DESIGN
            </div>
          </div>
        </div>

        {/* right: invoke rail */}
        <div className="space-y-4">
          <div className={`panel p-6 ${state.invoking ? "invoking !border-violet" : ""}`}>
            <div className="flex items-baseline justify-between">
              <span className="mono text-4xl font-bold">{yen(s.priceJpy)}</span>
              <span className="meta text-[11px] text-dim">PER CALL</span>
            </div>
            <div className="meta text-[11px] text-dim mt-2">
              ★ {s.rating.toFixed(1)} · EXPERT KEEPS {yen(Math.round(s.priceJpy * 0.85))} ·
              X402 / USDC
            </div>
            <button onClick={invoke} className="btn-ink w-full justify-center mt-5">
              {state.invoking ? "INVOKING…" : "INVOKE AS AGENT →"}
            </button>
            {state.answerShown && (
              <div className="meta text-[10.5px] text-green mt-3">
                ● SETTLED · SEE STORE HERO / WALLET AUDIT LOG
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
              <span className="text-foreground">0x8a4f21c9d7…3be3d0</span>
              <br />
              registered 2026-05-11 · Base Sepolia
              <br />
              <span className="underline underline-offset-2">view on BaseScan ↗</span>
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
