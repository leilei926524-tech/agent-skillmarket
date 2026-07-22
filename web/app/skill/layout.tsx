import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Skill Details — GOKUI",
  description: "Inspect a GOKUI skill's publisher, license, risk summary, price, invocation endpoint, and x402 payment contract.",
  alternates: { canonical: "/skill/" },
  robots: { index: false, follow: true },
};

export default function SkillLayout({ children }: { children: React.ReactNode }) { return children; }
