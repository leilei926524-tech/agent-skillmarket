"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ChartPaper() {
  return (
    <>
      <div className="paper-field" aria-hidden />
      <div className="chart-rails hidden md:block" aria-hidden />
      <span className="crosshair hidden md:block" style={{ left: "calc(50vw - 8px)", top: "17vh" }} aria-hidden />
      <span className="crosshair hidden md:block" style={{ left: "calc(4vw - 8px)", top: "58vh" }} aria-hidden />
      <span className="crosshair hidden md:block" style={{ left: "calc(96vw - 8px)", top: "34vh" }} aria-hidden />
    </>
  );
}

const NAV = [
  { href: "/", label: "INDEX", mobileHidden: true },
  { href: "/store", label: "STORE" },
  { href: "/submit", label: "SUBMIT" },
  { href: "/agents", label: "AGENT GATE", mobileLabel: "AGENTS" },
  { href: "/console", label: "ACTIVITY", mobileHidden: true },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-40 bg-background/90 border-b border-line backdrop-blur-sm">
      <div className="mx-auto max-w-[1360px] px-4 md:px-6 min-h-14 flex items-center gap-4">
        <Link href="/" className="font-extrabold tracking-tight text-[17px] shrink-0">
          EXPERTOS<span className="text-violet">.</span>
        </Link>
        <nav className="nav-scroll flex items-center gap-4 md:gap-5 meta text-[10px] md:text-[11.5px] overflow-x-auto py-4" aria-label="Primary">
          {NAV.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`${item.mobileHidden ? "hidden sm:inline" : ""} ${active ? "text-violet font-bold" : "text-foreground/80 hover:text-violet"}`}>
                {item.mobileLabel ? <><span className="sm:hidden">{item.mobileLabel}</span><span className="hidden sm:inline">{item.label}</span></> : item.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/agents" className="ml-auto !hidden lg:!inline-flex chip bg-foreground text-white border border-foreground">
          API LIVE
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line mt-14">
      <div className="mx-auto max-w-[1360px] px-6 py-5 flex flex-wrap items-center justify-between gap-3 meta text-[10.5px] text-dim">
        <span>EXPERTOS © 2026 · AGENT SKILL MARKETPLACE</span>
        <span>REST · D1 · X402 V2</span>
        <span>SCANS REDUCE RISK; THEY ARE NOT ENDORSEMENTS</span>
      </div>
    </footer>
  );
}
