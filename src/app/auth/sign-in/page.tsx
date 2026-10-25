import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/auth/next";

export const metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; neon_auth_session_verifier?: string }> }) {
  const { next, error, neon_auth_session_verifier: verifier } = await searchParams;
  // Already signed in: go straight to the app.
  if (await getViewer()) redirect(safeNext(next));
  // Coming back here with an error, or with an unused one-time code, means Google sign-in did not finish.
  const problem = error || verifier ? "Google sign-in did not finish. Please try again." : null;
  return <AuthForm mode="sign-in" next={safeNext(next)} problem={problem} />;
}
