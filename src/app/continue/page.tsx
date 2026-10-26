import { SignInSplash } from "@/components/splash";

export const metadata = { title: "Signing you in" };

/**
 * Where every sign-in ends. Google sends people here and the sign-in screen is drawn at once, with nothing to wait
 * for: it asks /api/continue where this person goes next while it plays.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next, as } = await searchParams;
  const q = new URLSearchParams();
  if (next) q.set("next", next);
  if (as) q.set("as", as);
  return <SignInSplash lookup={`/api/continue${q.size ? `?${q}` : ""}`} />;
}
