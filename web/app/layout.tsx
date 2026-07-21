import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav, ChartPaper, Footer } from "@/components/nav";
import { I18nProvider } from "@/lib/i18n";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://expertos-agent-skillmarket.1924902988hu.workers.dev"),
  title: "ExpertOS — Make your AI work smarter",
  description:
    "Reuse the latest skills from domain experts to make your AI work smarter.",
  openGraph: {
    title: "ExpertOS — Make your AI work smarter",
    description: "Reuse the latest skills from domain experts to make your AI work smarter.",
    type: "website",
    images: [{
      url: "/og.png",
      width: 1734,
      height: 907,
      alt: "ExpertOS — Reuse the latest skills from domain experts to make your AI work smarter.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ExpertOS — Make your AI work smarter",
    description: "Reuse the latest skills from domain experts to make your AI work smarter.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <ChartPaper />
          <Nav />
          <div className="flex-1">{children}</div>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
