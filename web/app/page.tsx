"use client";

import Link from "next/link";
import { useDemo, yen } from "@/lib/demo";
import { Ticker } from "@/components/nav";

const STEPS = [
  {
    n: "01",
    key: "1",
    title: "INVOKE",
    body: "An agent hits a judgment call it can't make. It invokes an encrypted expert skill over MCP — pays per call, gets the guardrail answer. The logic never leaves the vault.",
    foot: "¥120/call · settled on Base Sepolia",
  },
  {
    n: "02",
    key: "2",
    title: "HIRE",
    body: "No skill exists? The agent doesn't stop. ExpertOS matches a verified human expert and emails a consent-based task offer — scope, deadline, price.",
    foot: "opt-in experts · ¥15,000 median task",
  },
  {
    n: "03",
    key: "3",
    title: "MINT",
    body: "The delivered task is compiled into a skill draft. The expert reviews, approves, encrypts — and earns 85% on every future call, while asleep.",
    foot: "every job becomes tomorrow's skill",
  },
];

export default function Landing() {
  const { state } = useDemo();
  const totalCalls = state.skills.reduce((a, s) => a + s.calls, 0);

  return (
    <main>
      {/* ── hero ── */}
      <section className="mx-auto max-w-[1360px] px-6 pt-12 md:pt-16 pb-10 relative">
        <div className="flex flex-wrap gap-6 justify-between items-start mb-10">
          <div className="kicker">
            The Human Intelligence
            <br />
            Layer for AI agents
          </div>
          <div className="meta text-[12px] max-w-sm hidden md:block leading-relaxed">
            Agents invoke encrypted expert skills instantly, or hire verified
            humans when no skill exists — every completed task becomes
            tomorrow&apos;s reusable skill.
          </div>
          <div className="meta text-[12px] text-dim hidden lg:block text-right">
            Thinking in agents.
            <br />
            Pricing in judgment.
          </div>
        </div>

        <div className="relative">
          <h1 className="display-hero text-[13vw] md:text-[7.2rem] lg:text-[8.4rem]">
            Agents hit walls.
            <br />
            Experts are
            <br />
            the door.
          </h1>

          {/* gel centerpiece */}
          <div className="absolute right-[4%] top-[26%] hidden md:block select-none">
            <div className="gel px-10 py-7 text-2xl font-extrabold rotate-[-7deg]">
              ¥120<span className="text-sm font-semibold ml-1 opacity-90">/call</span>
              <span className="sparkle" style={{ left: "-12px", top: "-10px" }} />
              <span
                className="sparkle"
                style={{ right: "-8px", bottom: "-12px", width: "18px", height: "18px", animationDelay: "1.2s" }}
              />
            </div>
          </div>
          <div className="absolute left-[46%] bottom-[-8px] hidden lg:block">
            <span className="sticker rotate-[2.5deg]">85% to the expert ✓</span>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link href="/store" className="btn-ink">
            ENTER THE STORE <span aria-hidden>→</span>
          </Link>
          <Link
            href="/console"
            className="meta text-[12px] underline underline-offset-4 hover:text-violet"
          >
            WATCH LIVE CONSOLE
          </Link>
          <span className="meta text-[11px] text-dim ml-auto hidden md:inline">
            PREFERS-REDUCED-MOTION SAFE
          </span>
        </div>
      </section>

      <Ticker />

      {/* ── system: three ruled columns keyed to the demo ── */}
      <section className="mx-auto max-w-[1360px] px-6 py-14">
        <div className="kicker mb-8">The system · press 1 — 2 — 3</div>
        <div className="grid md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className={`py-6 md:py-2 md:px-8 ${i > 0 ? "md:border-l border-line border-t md:border-t-0" : ""} md:first:pl-0`}
            >
              <div className="flex items-baseline justify-between">
                <span className="mono text-5xl font-bold text-violet/90">{s.n}</span>
                <span className="meta text-[10.5px] text-dim">KEY [{s.key}]</span>
              </div>
              <h3 className="display-hero text-2xl mt-4">{s.title}</h3>
              <p className="text-[14px] leading-relaxed mt-3 text-foreground/85">{s.body}</p>
              <div className="meta text-[11px] text-dim mt-4">{s.foot}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── stats band ── */}
      <section className="border-t border-b border-line bg-white/35">
        <div className="mx-auto max-w-[1360px] px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { v: totalCalls.toLocaleString(), k: "CALLS SETTLED" },
            { v: String(state.skills.length), k: "ENCRYPTED SKILLS LIVE" },
            { v: "85 / 15", k: "EXPERT / PLATFORM SPLIT" },
            { v: yen(state.lifetime), k: "PAID TO EXPERTS" },
          ].map((s) => (
            <div key={s.k}>
              <div className="mono text-3xl md:text-4xl font-bold">{s.v}</div>
              <div className="kicker mt-2 !text-[9.5px]">{s.k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── flywheel ── */}
      <section className="mx-auto max-w-[1360px] px-6 py-14">
        <div className="kicker mb-6">The flywheel</div>
        <p className="display-hero text-2xl md:text-4xl leading-tight max-w-4xl">
          More agent missions <span className="text-violet">→</span> more human
          work <span className="text-violet">→</span> more reusable skills{" "}
          <span className="text-violet">→</span> better ExpertOS<span className="text-violet">.</span>
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <span className="sticker">Upwork is human-to-human</span>
          <span className="sticker rotate-[2deg]">We are agent-to-skill</span>
          <span className="sticker rotate-[-1.5deg]">and agent-to-human ✦</span>
        </div>
      </section>
    </main>
  );
}
