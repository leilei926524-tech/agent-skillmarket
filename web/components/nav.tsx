"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, type TranslationKey } from "@/lib/i18n";

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
  { href: "/", label: "nav.index", mobileHidden: true },
  { href: "/store", label: "nav.store" },
  { href: "/submit", label: "nav.submit" },
  { href: "/agents", label: "nav.agentGate", mobileLabel: "nav.agents" },
  { href: "/console", label: "nav.activity", mobileHidden: true },
] satisfies { href: string; label: TranslationKey; mobileLabel?: TranslationKey; mobileHidden?: boolean }[];

export function Nav() {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 bg-background/90 border-b border-line backdrop-blur-sm">
      <div className="mx-auto max-w-[1360px] px-4 md:px-6 min-h-14 flex items-center gap-3 md:gap-4">
        <Link href="/" className="font-extrabold tracking-tight text-[17px] shrink-0">
          GOKUI<span className="text-violet">.</span>
        </Link>
        <nav className="nav-scroll flex items-center gap-3 md:gap-5 meta text-[9.5px] md:text-[11.5px] overflow-x-auto py-4" aria-label={t("nav.primary")}>
          {NAV.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`${item.mobileHidden ? "hidden sm:inline" : ""} ${active ? "text-violet font-bold" : "text-foreground/80 hover:text-violet"}`}>
                {item.mobileLabel ? <><span className="sm:hidden">{t(item.mobileLabel)}</span><span className="hidden sm:inline">{t(item.label)}</span></> : t(item.label)}
              </Link>
            );
          })}
        </nav>
        <Link href="/agents" className="ms-auto !hidden 2xl:!inline-flex chip bg-foreground text-white border border-foreground">
          {t("nav.apiLive")}
        </Link>
        <LanguageSwitcher />
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-line mt-14">
      <div className="mx-auto max-w-[1360px] px-6 py-5 flex flex-wrap items-center justify-between gap-3 meta text-[10.5px] text-dim">
        <span>GOKUI © 2026 · {t("footer.marketplace")}</span>
        <span>{t("footer.stack")}</span>
        <span>{t("footer.disclaimer")}</span>
      </div>
    </footer>
  );
}
