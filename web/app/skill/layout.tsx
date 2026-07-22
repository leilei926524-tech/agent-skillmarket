import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Agent Skill Details — GOKUI",
  description: "Inspect a GOKUI Skill's publisher, license, risk note, pinned source or paid invocation contract, and example input.",
  alternates: { canonical: "/skill/" },
  robots: { index: false, follow: true },
};

export default function SkillLayout({ children }: { children: React.ReactNode }) { return children; }
