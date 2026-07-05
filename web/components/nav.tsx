"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useDemo, yen } from "@/lib/demo";

/* sky paper + hairline rails + crosshair marks */
export function ChartPaper() {
  return (
    <>
      <div className="paper-field" aria-hidden />
      <div className="chart-rails hidden md:block" aria-hidden />
      <span className="crosshair hidden md:block" style={{ left: "calc(50vw - 8px)", top: "17vh" }} aria-hidden />
      <span className="crosshair hidden md:block" style={{ left: "calc(4vw - 8px)", top: "58vh" }} aria-hidden />
      <span className="crosshair hidden md:block" style={{ left: "calc(96vw - 8px)", top: "34vh" }} aria-hidden />
      <span className="crosshair hidden md:block" style={{ left: "calc(50vw - 8px)", top: "82vh" }} aria-hidden />
    </>
  );
}

/* live JST clock — client-only tick, placeholder until mounted */
function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const f = () =>
      setNow(
        new Date().toLocaleTimeString("en-GB", {
          timeZone: "Asia/Tokyo",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    f();
    const t = setInterval(f, 10_000);
    return () => clearInterval(t);
  }, []);
  return <>{now ?? "--:--"}</>;
}

const NAV = [
  { href: "/", label: "INDEX" },
  { href: "/store", label: "STORE" },
  { href: "/skill", label: "SKILL[01]" },
  { href: "/wallet", label: "WALLET" },
  { href: "/console", label: "CONSOLE" },
];

export function Nav() {
  const path = usePathname();
  const { state } = useDemo();

  return (
    <header className="sticky top-0 z-40 bg-background/85 border-b border-line">
      <div className="mx-auto max-w-[1360px] px-6 h-14 flex items-center gap-6">
        <Link href="/" className="font-extrabold tracking-tight text-[17px]">
          EXPERTOS<span className="text-violet">.</span>
        </Link>
        <nav className="flex items-center gap-5 meta text-[11.5px]">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`transition-colors hover:text-violet ${
                path === n.href ? "text-violet font-bold" : "text-foreground/80"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden md:flex items-center gap-5 meta text-[11.5px]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green live-dot" />
            NEGO-AGENT-7F2E
          </span>
          <span className="text-dim">
            GMT+9 OSAKA <Clock /> · {yen(state.lifetime)} SETTLED
          </span>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line mt-14">
      <div className="mx-auto max-w-[1360px] px-6 py-4 flex flex-wrap items-center justify-between gap-3 meta text-[11px] text-dim">
        <span>EXPERTOS © 2026 · THE HUMAN INTELLIGENCE LAYER</span>
        <span>0600 X 0349 Y</span>
        <span>C0MPILED IN JAPAN PT.3 · OSAKA</span>
      </div>
    </footer>
  );
}

export function Toasts() {
  const { state } = useDemo();
  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 w-[340px]">
      {state.toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in bg-white border-[1.5px] border-foreground rounded-xl p-3"
          style={{ boxShadow: "4px 5px 0 rgba(14,14,40,.85)" }}
        >
          <div className="text-[13px] font-bold flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                t.kind === "mint" ? "bg-amber" : t.kind === "mail" ? "bg-violet" : "bg-green"
              }`}
            />
            <span className="mono">{t.title}</span>
          </div>
          <div className="text-xs text-dim mt-1">{t.body}</div>
        </div>
      ))}
    </div>
  );
}

export function KeyHints() {
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 meta text-[10.5px] text-dim bg-white/85 border border-line rounded-full px-4 py-1.5">
      DEMO · <b className="text-foreground">1</b> INVOKE · <b className="text-foreground">2</b> HIRE ·{" "}
      <b className="text-foreground">3</b> MINT · <b className="text-foreground">P</b> AMBIENT ·{" "}
      <b className="text-foreground">R</b> RESET
    </div>
  );
}

/* live settlement ticker fed by demo state */
export function Ticker() {
  const { state } = useDemo();
  const items = state.audit.slice(0, 8).map((r) =>
    r.kind === "mint"
      ? `SKILL_MINTED · ${r.skillName.toUpperCase()}`
      : `${r.agent.toUpperCase()} PAID ${yen(r.gross)} · ${r.skillName.toUpperCase()} · EXPERT +${yen(r.net)}`,
  );
  const track = items.length ? items : ["AWAITING FIRST SETTLEMENT"];
  return (
    <div className="marquee">
      <div className="marquee-track meta text-[11px]">
        {[...track, ...track].map((s, i) => (
          <span key={i} className="inline-flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-violet inline-block" />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
