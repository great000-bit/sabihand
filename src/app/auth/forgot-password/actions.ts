"use server";

import { authConfigured, getAuth } from "@/lib/auth/server";

type Result = { error: string | null };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a 6-digit code to the address. The answer is the same whether or not an account exists, so this form
 * cannot be used to find out who has signed up.
 */
export async function sendResetCode(emailRaw: string): Promise<Result> {
  if (!authConfigured) return { error: "Sign-in is not set up in this environment." };
  const email = String(emailRaw ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) return { error: "Enter a valid email address." };
  try {
    await getAuth().emailOtp.sendVerificationOtp({ email, type: "forget-password" });
  } catch (e) {
    console.error("reset code failed", e);
  }
  return { error: null };
}

export async function resetPasswordWithCode(emailRaw: string, codeRaw: string, passwordRaw: string): Promise<Result> {
  if (!authConfigured) return { error: "Sign-in is not set up in this environment." };
  const email = String(emailRaw ?? "").trim().toLowerCase();
  const otp = String(codeRaw ?? "").replace(/\s/g, "");
  const password = String(passwordRaw ?? "");
  if (!EMAIL.test(email)) return { error: "Enter a valid email address." };
  if (!/^\d{4,10}$/.test(otp)) return { error: "Enter the code from the email." };
  if (password.length < 8 || password.length > 128) return { error: "Your new password needs at least 8 characters." };
  try {
    const { error } = await getAuth().emailOtp.resetPassword({ email, otp, password });
    if (error) return { error: "That code is wrong or has expired. Ask for a new one." };
  } catch (e) {
    console.error("reset failed", e);
    return { error: "We could not reset the password. Please try again in a moment." };
  }
  return { error: null };
}
