"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n, type TranslationKey } from "@/lib/i18n";

export function ChartPaper() { return null; }

export function SkipLink() {
  const { t } = useI18n();
  return <a href="#main-content" className="skip-link">{t("common.skipToContent")}</a>;
}

const NAV_GROUPS = [
  {
    group: "Discover",
    items: [
      { href: "/", label: "nav.index", icon: "⬡" },
      { href: "/store", label: "nav.store", icon: "◈" },
      { href: "/console", label: "nav.activity", icon: "◎" },
    ],
  },
  {
    group: "Build",
    items: [
      { href: "/submit", label: "nav.submit", icon: "✦" },
      { href: "/agents", label: "nav.agentGate", icon: "⟁" },
      { href: "/wallet", label: "nav.stack", icon: "⬟" },
    ],
  },
] satisfies { group: string; items: { href: string; label: TranslationKey; icon: string }[] }[];

function SidebarNav() {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-line sticky top-0 h-screen" style={{ background: "var(--bg-raised)" }}>
      <div className="px-5 h-14 flex items-center border-b border-line">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-white text-[15px] font-bold"
            style={{ background: "linear-gradient(135deg, #5b9bff, #1e51c7)", boxShadow: "0 6px 18px -6px rgba(93,108,255,0.7)" }}
          >G</span>
          <span className="font-bold tracking-tight text-[15px]">
            GOKUI<span style={{ color: "var(--accent)" }}>.</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label={t("nav.primary")}>
        {NAV_GROUPS.map((g) => (
          <div key={g.group} className="mb-5">
            <div className="kicker !text-[9.5px] px-3 mb-2">{g.group}</div>
            {g.items.map((item) => {
              const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[13.5px] transition-colors mb-0.5 ${
                    active
                      ? "font-medium border"
                      : "border border-transparent"
                  }`}
                  style={active
                    ? { background: "rgba(77,141,255,0.1)", color: "var(--text)", borderColor: "rgba(77,141,255,0.2)" }
                    : { color: "var(--text-secondary)" }}
                >
                  <span className="text-[12px] shrink-0" style={active ? { color: "var(--accent)" } : { color: "var(--muted)" }}>
                    {item.icon}
                  </span>
                  {t(item.label)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-line">
        <LanguageSwitcher />
        <div className="mt-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: "var(--success)" }} />
          <span className="kicker !text-[9px] !tracking-[0.14em]">x402 · Base</span>
        </div>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <header className="lg:hidden sticky top-0 z-40 border-b border-line backdrop-blur-md" style={{ background: "rgba(6,11,22,0.92)" }}>
      <div className="px-4 h-14 flex items-center gap-3">
        <Link href="/" className="font-bold tracking-tight text-[16px] shrink-0">
          GOKUI<span style={{ color: "var(--accent)" }}>.</span>
        </Link>
        <nav className="nav-scroll flex items-center gap-3 overflow-x-auto py-4 flex-1" aria-label={t("nav.primary")}>
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="kicker !text-[9.5px] !tracking-[0.14em] whitespace-nowrap nav-link"
                style={active ? { color: "var(--accent)", fontWeight: 700 } : { color: "var(--text-secondary)" }}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}

export function Nav() {
  return (
    <>
      <SidebarNav />
      <MobileTopBar />
    </>
  );
}

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-line mt-14">
      <div className="mx-auto max-w-5xl px-6 py-5 flex flex-wrap items-center justify-between gap-3 meta text-[10.5px]" style={{ color: "var(--muted)" }}>
        <span>GOKUI © 2026 · {t("footer.marketplace")}</span>
        <nav aria-label={t("footer.legalNavigation")} className="flex flex-wrap items-center gap-4">
          <Link href="/wallet" className="hover:text-accent transition-colors">{t("footer.stack")}</Link>
          <Link href="/privacy" className="hover:text-accent transition-colors">{t("footer.privacy")}</Link>
          <Link href="/terms" className="hover:text-accent transition-colors">{t("footer.terms")}</Link>
        </nav>
        <span>{t("footer.disclaimer")}</span>
      </div>
    </footer>
  );
}
