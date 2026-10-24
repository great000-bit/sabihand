"use server";

import { redirect } from "next/navigation";
import { authConfigured, getAuth } from "@/lib/auth/server";
import { safeNext } from "@/lib/auth/next";

export async function signUpWithEmail(_prev: { error: string } | null, form: FormData) {
  if (!authConfigured) return { error: "Sign-in is not set up in this environment." };
  const email = String(form.get("email") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !name) return { error: "Enter your name and email address." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  const { error } = await getAuth().signUp.email({ email, name, password });
  if (error) return { error: error.message || "Could not create the account." };
  redirect(safeNext(form.get("next")));
}
