"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemo, yen } from "@/lib/demo";

export function LiquidBackground() {
  return (
    <>
      <div className="liquid-field" aria-hidden>
        <div className="blob blob-violet" />
        <div className="blob blob-lav" />
        <div className="blob blob-cyan" />
        <div className="blob blob-pink" />
      </div>
      <div className="grid-overlay" aria-hidden />
      <span className="frame-label frame-tl hidden md:block">
        ExpertOS · Human Intelligence Layer
      </span>
      <span className="frame-label frame-tc hidden lg:block">Aurora Violet</span>
      <span className="frame-label frame-tr hidden md:block">2026 · Osaka</span>
      <span className="frame-label frame-bl hidden md:block">
        agent-skillmarket
      </span>
      <span className="frame-label frame-br hidden md:block">
        c0mpiled in Japan pt.3
      </span>
    </>
  );
}

export function Nav() {
  const path = usePathname();
  const { state } = useDemo();

  const tab = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
        path === href
          ? "bg-white/10 text-white border border-white/25"
          : "text-dim hover:text-white border border-transparent"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 bg-background/85 border-b border-line">
      <div className="mx-auto max-w-6xl px-5 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet via-amber to-green grid place-items-center text-[11px] font-black text-background">
            E
          </div>
          <span className="font-semibold tracking-tight">ExpertOS</span>
        </div>
        <nav className="flex items-center gap-1">
          {tab("/", "Skill Store")}
          {tab("/wallet", "Seller Wallet")}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <span className="chip bg-green/10 text-green border border-green/25">
            <span className="w-1.5 h-1.5 rounded-full bg-green live-dot" />
            agent connected · nego-agent-7f2e
          </span>
          <span className="mono text-xs text-dim hidden md:inline">
            settlement: Base Sepolia · {yen(state.lifetime)} lifetime
          </span>
        </div>
      </div>
    </header>
  );
}

export function Toasts() {
  const { state } = useDemo();
  return (
    <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 w-[340px]">
      {state.toasts.map((t) => (
        <div key={t.id} className="panel toast-in p-3 bg-[#0c0f15]/95 shadow-xl">
          <div className="text-[13px] font-semibold flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
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
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 mono text-[11px] text-dim/70 bg-[#141430]/90 border border-line rounded-full px-4 py-1.5">
      demo keys · <b className="text-foreground/80">1</b> invoke ·{" "}
      <b className="text-foreground/80">2</b> human-hire ·{" "}
      <b className="text-foreground/80">3</b> mint skill ·{" "}
      <b className="text-foreground/80">P</b> ambient ·{" "}
      <b className="text-foreground/80">R</b> reset
    </div>
  );
}
