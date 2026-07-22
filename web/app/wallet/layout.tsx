import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "x402 Agent Payments — ExpertOS",
  description: "See how ExpertOS agent calls disclose price, settle USDC through x402, and record payment evidence.",
  alternates: { canonical: "/wallet/" },
  openGraph: { title: "x402 Agent Payments — ExpertOS", url: "/wallet/" },
};

export default function WalletLayout({ children }: { children: React.ReactNode }) { return children; }
