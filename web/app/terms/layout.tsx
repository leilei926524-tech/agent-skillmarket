import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beta Terms — GOKUI",
  description: "Operating rules and current limits for publishing skills, connecting agents, and using paid GOKUI endpoints.",
  alternates: { canonical: "/terms/" },
  openGraph: { title: "Beta Terms — GOKUI", url: "/terms/" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) { return children; }
