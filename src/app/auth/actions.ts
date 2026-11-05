"use server";

import { redirect } from "next/navigation";
import { authConfigured, getAuth } from "@/lib/auth/server";

type State = { error: string } | null;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only our own /continue page may be the landing spot, so the form cannot be used to send people elsewhere. */
function landing(form: FormData): string {
  const to = String(form.get("landing") ?? "");
  return to.startsWith("/continue") && !to.startsWith("//") ? to : "/continue";
}

/**
 * Email and password sign-in runs on our server, which talks to the auth service itself. The browser only ever
 * talks to our own site, so it works on any network, even one whose DNS cannot find the auth service.
 */
export async function signInWithEmail(_prev: State, form: FormData): Promise<State> {
  if (!authConfigured) return { error: "Sign-in is not set up in this environment." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!EMAIL.test(email) || !password) return { error: "Enter your email address and password." };
  try {
    const { error } = await getAuth().signIn.email({ email, password });
    if (error) {
      return { error: "That email and password do not match. If you joined with Google, use Google, or tap “Forgot your password?” to set one." };
    }
  } catch (e) {
    console.error("email sign-in failed", e);
    return { error: "Sign-in is not responding. Please try again in a moment." };
  }
  redirect(landing(form));
}

export async function signUpWithEmail(_prev: State, form: FormData): Promise<State> {
  if (!authConfigured) return { error: "Sign-in is not set up in this environment." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const password = String(form.get("password") ?? "");
  if (!name) return { error: "Enter your name." };
  if (!EMAIL.test(email) || email.length > 200) return { error: "Enter a valid email address." };
  if (password.length < 8 || password.length > 128) return { error: "Use a password of at least 8 characters." };
  try {
    const { error } = await getAuth().signUp.email({ email, name, password });
    if (error) {
      const taken = /exist|already/i.test(error.message ?? "");
      return { error: taken ? "There is already an account with this email. Sign in instead, or use Google if you joined with Google." : error.message || "Could not create the account." };
    }
  } catch (e) {
    console.error("email sign-up failed", e);
    return { error: "Sign-up is not responding. Please try again in a moment." };
  }
  redirect(landing(form));
}
