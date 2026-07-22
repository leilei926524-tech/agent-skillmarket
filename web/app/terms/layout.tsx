import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beta Terms — ExpertOS",
  description: "Operating rules and current limits for publishing skills, connecting agents, and using paid ExpertOS endpoints.",
  alternates: { canonical: "/terms/" },
  openGraph: { title: "Beta Terms — ExpertOS", url: "/terms/" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) { return children; }
