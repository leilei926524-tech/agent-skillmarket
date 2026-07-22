"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, useI18n } from "@/lib/i18n";

const SOURCE_URL = "https://help.openai.com/en/articles/8357869-how-to-change-your-language-setting-in-chatgpt";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const current = LOCALES.find((option) => option.code === locale) || LOCALES[0];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return LOCALES;
    return LOCALES.filter((option) =>
      `${option.nativeName} ${option.englishName} ${option.code}`.toLocaleLowerCase().includes(normalized),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="language-switcher relative ms-auto shrink-0">
      <button
        ref={triggerRef}
        type="button"
        className="language-trigger"
        aria-label={`${t("language.button")}: ${current.nativeName}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="language-options"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden className="language-glyph">文A</span>
        <span className="hidden xl:inline max-w-28 truncate">{current.nativeName}</span>
        <span className="mono text-[9px] uppercase opacity-60">{current.code.split("-")[0]}</span>
        <span aria-hidden className={`text-[9px] transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="language-menu" role="dialog" aria-label={t("language.menuTitle")}>
          <div className="language-menu-head">
            <div>
              <div className="kicker !text-[9px]">{t("language.menuTitle")}</div>
              <div className="text-[10px] text-dim mt-1 leading-snug">{t("language.coverage")}</div>
            </div>
            <button type="button" className="language-close" aria-label={t("language.close")} onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>×</button>
          </div>
          <input
            ref={searchRef}
            className="field !mt-0"
            type="search"
            aria-label={t("language.search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("language.search")}
          />
          <div id="language-options" className="language-list" aria-label={t("language.menuTitle")}>
            {filtered.map((option) => (
              <button
                type="button"
                aria-pressed={option.code === locale}
                key={option.code}
                className={`language-option ${option.code === locale ? "is-active" : ""}`}
                onClick={() => {
                  setLocale(option.code);
                  setOpen(false);
                  setQuery("");
                  requestAnimationFrame(() => triggerRef.current?.focus());
                }}
              >
                <span className="font-semibold truncate">{option.nativeName}</span>
                <span className="text-[10px] text-dim truncate">{option.englishName}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="col-span-2 p-4 text-sm text-dim">{t("language.noResults")}</p>}
          </div>
          <a className="language-source" href={SOURCE_URL} target="_blank" rel="noreferrer" aria-label={`${t("language.source")} (opens in a new tab)`}>
            {t("language.source")} ↗
          </a>
        </div>
      )}
    </div>
  );
}
