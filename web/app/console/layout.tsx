import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Activity — GOKUI",
  description: "Inspect settled GOKUI skill invocations and follow their public Base transaction receipts.",
  alternates: { canonical: "/console/" },
  robots: { index: false, follow: true },
  openGraph: { title: "Payment Activity — GOKUI", url: "/console/" },
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) { return children; }
