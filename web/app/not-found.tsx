import type { Metadata } from "next";
import { NotFoundContent } from "@/components/not-found-content";

export const metadata: Metadata = {
  title: "Page Not Found — GOKUI",
  robots: { index: false, follow: true },
};

export default function NotFound() { return <NotFoundContent />; }
