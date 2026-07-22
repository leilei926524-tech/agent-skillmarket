"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function NotFoundContent() {
  const { locale } = useI18n();
  const isZh = locale === "zh-CN";
  return (
    <main className="mx-auto max-w-[920px] px-6 py-16 w-full">
      <div className="kicker mb-3">404 · {isZh ? "没有这个页面" : "Page not found"}</div>
      <h1 className="display-hero text-5xl md:text-7xl">{isZh ? "这里没有你要找的内容。" : "Nothing is listed here."}</h1>
      <p className="mt-6 text-lg leading-relaxed max-w-2xl">{isZh ? "链接可能已经变更，或者这个 Skill 还没有上架。你可以回到商店重新搜索。" : "The link may have changed, or the Skill may not be listed yet. Return to the store and search again."}</p>
      <div className="flex flex-wrap gap-3 mt-8">
        <Link href="/store" className="btn-ink">{isZh ? "回到 Skill 商店" : "Back to the Skill store"}</Link>
        <Link href="/" className="btn-outline">{isZh ? "返回首页" : "Go home"}</Link>
      </div>
    </main>
  );
}
