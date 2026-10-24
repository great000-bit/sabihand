"use server";

import { redirect } from "next/navigation";
import { authConfigured, getAuth } from "@/lib/auth/server";
import { safeNext } from "@/lib/auth/next";

export async function signInWithEmail(_prev: { error: string } | null, form: FormData) {
  if (!authConfigured) return { error: "Sign-in is not set up in this environment." };
  const { error } = await getAuth().signIn.email({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: error.message || "Could not sign in. Check your email and password." };
  redirect(safeNext(form.get("next")));
}
