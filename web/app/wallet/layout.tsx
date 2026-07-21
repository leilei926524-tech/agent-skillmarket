import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "x402 Payments and Payouts — GOKUI",
  description: "See how GOKUI agent calls disclose price, settle USDC through x402, and record payment evidence.",
  alternates: { canonical: "/wallet/" },
  openGraph: { title: "x402 Payments and Payouts — GOKUI", url: "/wallet/" },
};

export default function WalletLayout({ children }: { children: React.ReactNode }) { return children; }
