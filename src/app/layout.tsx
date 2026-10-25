import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Header, Footer } from "@/components/chrome";
import { AosInit } from "@/components/aos-init";
import { getViewer } from "@/server/session";
import { loadAll, visibleTo } from "@/server/repo";
import { dbConfigured } from "@/server/db";
import { paystackEnabled } from "@/server/paystack";
import type { AppState } from "@/lib/types";

// One typeface for the whole site, the same as the logo.
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: { default: "Sabihand: trusted artisans near you", template: "%s | Sabihand" },
  description: "Find a verified plumber, electrician, tailor or carpenter near you, see the price before you book, and pay safely.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F7FB" },
    { media: "(prefers-color-scheme: dark)", color: "#080F22" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Runs before the page paints so a dark-mode visitor never sees a white flash. Mirrors theme-toggle.tsx.
const THEME_SCRIPT = `try{var t=localStorage.getItem("sabihand-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`;

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
    <html lang="en" className={spaceGrotesk.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <StoreProvider state={state} viewer={viewer} config={{ paymentsEnabled: paystackEnabled(), dataAvailable }}>
          <AosInit />
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
