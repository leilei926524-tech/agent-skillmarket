import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Activity — ExpertOS",
  description: "Inspect settled ExpertOS skill invocations and follow their public Base transaction receipts.",
  alternates: { canonical: "/console/" },
  robots: { index: false, follow: true },
  openGraph: { title: "Payment Activity — ExpertOS", url: "/console/" },
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) { return children; }
