import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "x402 Agent Payments — GOKUI",
  description: "See how GOKUI agent calls disclose price, settle USDC through x402, and record payment evidence.",
  alternates: { canonical: "/wallet/" },
  openGraph: { title: "x402 Agent Payments — GOKUI", url: "/wallet/" },
};

export default function WalletLayout({ children }: { children: React.ReactNode }) { return children; }
