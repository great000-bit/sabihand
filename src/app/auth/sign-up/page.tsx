import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/auth/next";
import { signUpWithEmail } from "./actions";

export const metadata = { title: "Create account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Already signed in: go straight to the app.
  if (await getViewer()) redirect(safeNext(next));
  return <AuthForm mode="sign-up" action={signUpWithEmail} next={safeNext(next)} />;
}
