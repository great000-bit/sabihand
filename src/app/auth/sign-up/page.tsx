import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { AuthForm } from "@/components/auth-form";
import { askedFor, continueUrl } from "@/lib/auth/next";

export const metadata = { title: "Create account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; as?: string; error?: string; neon_auth_session_verifier?: string }> }) {
  const { next, as, error, neon_auth_session_verifier: verifier } = await searchParams;
  // Already signed in: go straight to the app.
  if (await getViewer()) redirect(continueUrl(askedFor(next), as === "artisan"));
  // Coming back here with an error, or with an unused one-time code, means Google sign-in did not finish.
  const problem = error === "expired" ? "That sign-in took too long. Please try again." : error || verifier ? "Google sign-in did not finish. Please try again." : null;
  return <AuthForm mode="sign-up" next={askedFor(next)} as={as === "artisan" || askedFor(next).startsWith("/artisan/join") ? "artisan" : "customer"} problem={problem} />;
}
