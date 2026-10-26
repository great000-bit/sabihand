import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { AuthForm } from "@/components/auth-form";
import { askedFor, continueUrl, signInProblem } from "@/lib/auth/next";
import { authConfigured } from "@/lib/auth/server";

export const metadata = { title: "Create account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; as?: string; error?: string; neon_auth_session_verifier?: string }> }) {
  const { next, as, error, neon_auth_session_verifier: verifier } = await searchParams;
  // Already signed in: go straight to the app.
  // (Not when /continue just sent them back: that would loop if the two ever disagreed.)
  if (error !== "nosession" && (await getViewer())) redirect(continueUrl(askedFor(next), as === "artisan"));
  // Coming back here with an error, or with an unused one-time code, means sign-in did not finish.
  const problem = authConfigured ? signInProblem(error, verifier) : "Sign-in is not available in this environment.";
  return <AuthForm mode="sign-up" next={askedFor(next)} as={as === "artisan" || askedFor(next).startsWith("/artisan/join") ? "artisan" : "customer"} problem={problem} disabled={!authConfigured} />;
}
