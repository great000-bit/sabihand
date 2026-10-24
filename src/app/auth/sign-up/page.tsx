import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/auth/next";
import { signUpWithEmail } from "./actions";

export const metadata = { title: "Create account" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="sign-up" action={signUpWithEmail} next={safeNext(next)} />;
}
