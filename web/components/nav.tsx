"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemo, yen } from "@/lib/demo";

export function Nav() {
  const path = usePathname();
  const { state } = useDemo();

  const tab = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
        path === href
          ? "bg-violet/20 text-white border border-violet/40"
          : "text-dim hover:text-white border border-transparent"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-line">
      <div className="mx-auto max-w-6xl px-5 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet to-green grid place-items-center text-[11px] font-black text-black">
            E
          </div>
          <span className="font-semibold tracking-tight">
            ExpertOS
            <span className="text-dim font-normal text-xs ml-2 hidden sm:inline">
              the human intelligence layer for AI agents
            </span>
          </span>
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
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 mono text-[11px] text-dim/70 bg-[#0c0f15]/80 border border-line rounded-full px-4 py-1.5 backdrop-blur">
      demo keys · <b className="text-foreground/80">1</b> invoke ·{" "}
      <b className="text-foreground/80">2</b> human-hire ·{" "}
      <b className="text-foreground/80">3</b> mint skill ·{" "}
      <b className="text-foreground/80">P</b> ambient ·{" "}
      <b className="text-foreground/80">R</b> reset
    </div>
  );
}
