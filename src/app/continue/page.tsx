import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { dbConfigured, sql } from "@/server/db";
import { askedFor } from "@/lib/auth/next";

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
  if (!viewer) redirect(`/auth/sign-in${want ? `?next=${encodeURIComponent(want)}` : ""}`);
  if (want) redirect(want);
  if (await hasArtisanProfile(viewer.id)) redirect("/artisan");
  if (as === "artisan") redirect("/artisan/join");
  redirect("/artisans");
}
