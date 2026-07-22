import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect an AI Agent — ExpertOS",
  description: "Create revocable agent access, search approved skills by task, and apply server-side spend limits before paid calls.",
  alternates: { canonical: "/agents/" },
  openGraph: { title: "Connect an AI Agent — ExpertOS", url: "/agents/" },
};

export default function AgentsLayout({ children }: { children: React.ReactNode }) { return children; }
