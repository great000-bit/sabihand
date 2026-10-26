import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { dbConfigured, sql } from "@/server/db";
import { askedFor } from "@/lib/auth/next";
import { SignInSplash } from "@/components/splash";

export const metadata = { title: "Signing you in" };

async function hasArtisanProfile(userId: string): Promise<boolean> {
  if (!dbConfigured) return false;
  try {
    return ((await sql()`select 1 from app.artisans where owner_id = ${userId} limit 1`) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

/**
 * Where every sign-in ends. Google sends people here, and from here each person goes on to the right place:
 * a page they asked for, their jobs if they are an artisan, the artisan sign-up steps if they came to join,
 * and otherwise the list of artisans.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next, as } = await searchParams;
  const want = askedFor(next);
  const viewer = await getViewer();
  // Reaching here without a session means the sign-in did not complete: say so, rather than showing a silent sign-in page.
  if (!viewer) redirect(`/auth/sign-in?error=nosession${want ? `&next=${encodeURIComponent(want)}` : ""}`);
  let to = "/artisans";
  if (want) to = want;
  else if (await hasArtisanProfile(viewer.id)) to = "/artisan";
  else if (as === "artisan") to = "/artisan/join";
  return <SignInSplash to={to} />;
}
