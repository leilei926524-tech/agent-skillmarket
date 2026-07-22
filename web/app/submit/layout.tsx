import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Publish an Agent Skill — ExpertOS",
  description: "Use an AI assistant to turn your workflow into SKILL.md, run a pre-scan, and submit it for marketplace review.",
  alternates: { canonical: "/submit/" },
  openGraph: { title: "Publish an Agent Skill — ExpertOS", url: "/submit/" },
};

export default function SubmitLayout({ children }: { children: React.ReactNode }) { return children; }
