import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Notice — ExpertOS",
  description: "What the current ExpertOS beta stores, exposes, and uses when you submit skills, connect agents, or invoke paid endpoints.",
  alternates: { canonical: "/privacy/" },
  openGraph: { title: "Privacy Notice — ExpertOS", url: "/privacy/" },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) { return children; }
