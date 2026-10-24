import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Header, DemoBanner, Footer } from "@/components/chrome";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["500", "700", "800"] });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: { default: "Sabihand: trusted artisans near you", template: "%s | Sabihand" },
  description: "Find a verified artisan near you, see the price range, book, and pay safely.",
};

export const viewport: Viewport = { themeColor: "#0B1F4B", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`}>
      <body>
        <StoreProvider>
          <DemoBanner />
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
