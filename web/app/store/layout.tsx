import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Agent Skills — ExpertOS",
  description: "Browse paid Agent APIs and reviewed links to pinned upstream Skills, with prices, sources, publishers, and risk notes shown up front.",
  alternates: { canonical: "/store/" },
  openGraph: { title: "Browse Agent Skills — ExpertOS", url: "/store/" },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) { return children; }
