import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/auth/next";
import { signInWithEmail } from "./actions";

export const metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="sign-in" action={signInWithEmail} next={safeNext(next)} />;
}
