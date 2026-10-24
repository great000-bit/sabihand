import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Header, Footer } from "@/components/chrome";
import { getViewer } from "@/server/session";
import { loadAll, visibleTo } from "@/server/repo";
import { dbConfigured } from "@/server/db";
import { paystackEnabled } from "@/server/paystack";
import type { AppState } from "@/lib/types";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["500", "700", "800"] });
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export const metadata: Metadata = {
  title: { default: "Sabihand: trusted artisans near you", template: "%s | Sabihand" },
  description: "Find a verified plumber, electrician, tailor or carpenter near you, see the price before you book, and pay safely.",
};

export const viewport: Viewport = { themeColor: "#0B1F4B", width: "device-width", initialScale: 1 };

// Every page depends on who is signed in, so nothing here can be prerendered.
export const dynamic = "force-dynamic";

const EMPTY: AppState = { artisans: [], bookings: [], payments: [], reviews: [], reports: [] };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  let state = EMPTY;
  let dataAvailable = false;
  if (dbConfigured) {
    try {
      state = visibleTo((await loadAll()).state, viewer);
      dataAvailable = true;
    } catch (e) {
      console.error("could not load marketplace data", e);
    }
  }
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable}`}>
      <body>
        <StoreProvider state={state} viewer={viewer} config={{ paymentsEnabled: paystackEnabled(), dataAvailable }}>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
