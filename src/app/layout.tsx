import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { LaunchSplash } from "@/components/launch-splash";
import { Header, Footer } from "@/components/chrome";
import { Suspense } from "react";
import { AosInit } from "@/components/aos-init";
import { ScrollTop } from "@/components/scroll-top";
import { getViewer } from "@/server/session";
import { loadAll, visibleTo } from "@/server/repo";
import { dbConfigured } from "@/server/db";
import { paystackEnabled } from "@/server/paystack";
import type { AppState } from "@/lib/types";

// One typeface for the whole site, the same as the logo.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: { default: "Sabihand: trusted artisans near you", template: "%s | Sabihand" },
  description: "Find a verified artisan anywhere in Nigeria, see the price before you book, and pay safely.",
};

export const viewport: Viewport = { themeColor: "#050506", colorScheme: "dark", width: "device-width", initialScale: 1 };

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
    <html lang="en" className={spaceGrotesk.variable} data-theme="dark">
      <body>
        <LaunchSplash />
        <StoreProvider state={state} viewer={viewer} config={{ paymentsEnabled: paystackEnabled(), dataAvailable }}>
          <AosInit />
          <Suspense fallback={null}>
            <ScrollTop />
          </Suspense>
          <Header />
          {/* At least a full screen tall: the footer always starts below the fold, so it can never show on its own while a page opens. */}
          <main className="mx-auto min-h-[100svh] w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
