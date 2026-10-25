import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/auth/next";
import { signInWithEmail } from "./actions";

export const metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Already signed in: go straight to the app.
  if (await getViewer()) redirect(safeNext(next));
  return <AuthForm mode="sign-in" action={signInWithEmail} next={safeNext(next)} />;
}
