import type { Metadata, Viewport } from "next";
import "@fontsource/saira-stencil-one";
import "@fontsource/audiowide";
import "@fontsource-variable/nunito-sans";
import "./globals.css";
import { Cursor } from "@/components/Cursor";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { Preloader } from "@/components/Preloader";
import { AppProvider } from "@/components/providers/AppProvider";
import { Curtain } from "@/components/providers/Curtain";
import { site } from "@/content/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} · Bubble.io Developer | Nexorah`,
    template: `%s · ${site.name} | Nexorah`,
  },
  description: site.description,
  keywords: [
    "Bubble.io developer",
    "Bubble developer",
    "no-code developer",
    "API integrations",
    "booking platform",
    "Xano",
    "n8n automation",
    "George Nnamdi",
    "Nexorah",
  ],
  authors: [{ name: site.name }],
  openGraph: {
    type: "website",
    title: `${site.name} · Bubble.io Developer`,
    description: site.description,
    siteName: "Nexorah",
    images: [{ url: "/images/george-portrait.webp", width: 1024, height: 1024, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@George_nocode",
    title: `${site.name} · Bubble.io Developer`,
    description: site.description,
    images: ["/images/george-portrait.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#03133a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-lime focus:px-5 focus:py-3 focus:font-bold focus:text-ink"
          >
            Skip to content
          </a>
          <Preloader />
          <Curtain />
          <Cursor />
          <Nav />
          <main id="main" className="relative z-[1] bg-paper">
            {children}
          </main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
