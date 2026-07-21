"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/live";

type Stats = { skills: number; submissions: number; settledInvocations: number; network: string; mode: string };

const STEPS = [
  { n: "01", title: "SUBMIT", body: "Upload or paste a standard SKILL.md. ExpertOS validates its manifest, checks common prompt-injection, secret, and destructive-command patterns, then stores a durable review record." },
  { n: "02", title: "DISCOVER", body: "Agents register once, receive a revocable API key, then search and rank approved skills by task match, price, risk result, and real settled usage—not synthetic ratings." },
  { n: "03", title: "PAY + INVOKE", body: "A paid endpoint returns HTTP 402. An x402-compatible agent signs the USDC payment, retries the request, and receives the skill result plus settlement evidence." },
];

export default function Landing() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => { api<Stats>("/api/v1/public/stats").then(setStats).catch(() => setStats(null)); }, []);
  return (
    <main>
      <section className="mx-auto max-w-[1360px] px-6 pt-12 md:pt-16 pb-12 relative">
        <div className="flex flex-wrap gap-6 justify-between items-start mb-10">
          <div className="kicker">The marketplace layer<br />for capable agents</div>
          <div className="meta text-[12px] max-w-md leading-relaxed">
            Human-readable storefront. Machine-readable discovery. Reviewed skill packages. Native pay-per-call settlement.
          </div>
          <div className="meta text-[11px] text-dim lg:text-right">
            LIVE DATA ONLY<br />NO SIMULATED PAYOUTS
          </div>
        </div>
        <div className="relative">
          <h1 className="display-hero text-[13vw] md:text-[7.2rem] lg:text-[8.3rem]">
            Agents hit walls.<br />Skills open<br />the door.
          </h1>
          <div className="absolute right-[5%] top-[30%] hidden md:block select-none">
            <div className="gel px-9 py-7 text-xl font-extrabold">HTTP 402<span className="sparkle" style={{ left: "-12px", top: "-10px" }} /></div>
          </div>
        </div>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed">
          Publish agent skills through an OKX-inspired review flow, let agents find the best fit for a task, and charge for real invocations with x402 v2.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/store" className="btn-ink">BROWSE LIVE SKILLS →</Link>
          <Link href="/submit" className="btn-outline">SUBMIT A SKILL</Link>
          <Link href="/agents" className="btn-outline">CONNECT AN AGENT</Link>
        </div>
      </section>

      <section className="border-y border-line bg-white/35">
        <div className="mx-auto max-w-[1360px] px-6 py-7 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { v: stats?.skills ?? "—", k: "APPROVED SKILLS" },
            { v: stats?.submissions ?? "—", k: "DURABLE SUBMISSIONS" },
            { v: stats?.settledInvocations ?? "—", k: "SETTLED INVOCATIONS" },
            { v: stats?.network === "eip155:8453" ? "BASE MAINNET" : "BASE SEPOLIA", k: "PAYMENT NETWORK" },
          ].map((item) => <div key={item.k}><div className="mono text-3xl md:text-4xl font-bold">{item.v}</div><div className="kicker mt-2 !text-[9px]">{item.k}</div></div>)}
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-6 py-14">
        <div className="kicker mb-8">One real loop</div>
        <div className="grid md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.n} className={`py-6 md:px-8 ${index ? "border-t md:border-t-0 md:border-l border-line" : "md:pl-0"}`}>
              <span className="mono text-5xl font-bold text-violet">{step.n}</span>
              <h2 className="display-hero text-2xl mt-4">{step.title}</h2>
              <p className="text-sm leading-relaxed mt-3 text-foreground/85">{step.body}</p>
            </div>
          ))}
        </div>
        <div className="panel mt-10 p-5 md:p-7 flex flex-wrap gap-6 items-center justify-between">
          <div><div className="kicker !text-[9px] mb-2">TRUST BOUNDARY</div><p className="max-w-3xl text-sm leading-relaxed">Automated checks reduce obvious risk but do not make third-party skills safe or endorsed. Agents should inspect permissions, keep secrets out of prompts, enforce spend limits, and require confirmation for consequential writes.</p></div>
          <Link href="/.well-known/agent-skills.json" className="btn-outline mono text-xs">OPEN MACHINE MANIFEST</Link>
        </div>
      </section>
    </main>
  );
}
