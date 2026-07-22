import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Agent Skills — GOKUI",
  description: "Browse reviewed, callable agent skills with visible prices, publishers, risk summaries, and settled usage.",
  alternates: { canonical: "/store/" },
  openGraph: { title: "Browse Agent Skills — GOKUI", url: "/store/" },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) { return children; }
