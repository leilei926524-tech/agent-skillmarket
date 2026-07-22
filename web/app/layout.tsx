import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav, ChartPaper, Footer, SkipLink } from "@/components/nav";
import { I18nProvider } from "@/lib/i18n";
import { LOCALES, LOCALE_STORAGE_KEY } from "@/lib/i18n/config";

const localeBootstrap = `(()=>{try{const supported=${JSON.stringify(LOCALES.map((item) => item.code))};const stored=localStorage.getItem(${JSON.stringify(LOCALE_STORAGE_KEY)});const preferences=stored?[stored]:navigator.languages;let locale="en";for(const value of preferences){const normalized=String(value).toLowerCase();const exact=supported.find((item)=>item.toLowerCase()===normalized);const base=supported.find((item)=>item.toLowerCase().split("-")[0]===normalized.split("-")[0]);if(exact||base){locale=exact||base;break}}document.documentElement.lang=locale;document.documentElement.dir=["ar","fa","ur"].includes(locale)?"rtl":"ltr"}catch{}})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tryexpertos.com"),
  title: "ExpertOS — Expert Skills for AI Agents",
  description:
    "ExpertOS is an Agent Skill marketplace for reviewed task methods: browse pinned sources, submit SKILL.md, and let Agents discover and pay for hosted APIs.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "ExpertOS — Expert Skills for AI Agents",
    description: "Reuse reviewed Skills shaped by real practice, so your AI can handle each job with a clearer method and fewer guesses.",
    type: "website",
    url: "/",
    images: [{
      url: "/og.png",
      width: 1734,
      height: 907,
      alt: "ExpertOS — Put expert know-how to work in your AI.",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ExpertOS — Expert Skills for AI Agents",
    description: "Reuse reviewed Skills shaped by real practice, so your AI can handle each job with a clearer method and fewer guesses.",
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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="expertos-locale-bootstrap" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: localeBootstrap }} />
        <I18nProvider>
          <SkipLink />
          <ChartPaper />
          <Nav />
          <div id="main-content" tabIndex={-1} className="flex-1">{children}</div>
          <Footer />
        </I18nProvider>
      </body>
    </html>
  );
}
