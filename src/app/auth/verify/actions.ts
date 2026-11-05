"use server";

import { getViewer } from "@/server/session";
import { checkEmailCode, sendEmailCode, type CheckResult, type SendResult } from "@/server/email-check";

export async function sendVerifyCode(force: boolean): Promise<SendResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Your sign-in has ended. Please sign in again." };
  try {
    return await sendEmailCode(viewer, force);
  } catch (e) {
    console.error("send code failed", e);
    return { ok: false, error: "We could not send the code. Please try again." };
  }
}

export async function verifyEmailCode(code: string): Promise<CheckResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Your sign-in has ended. Please sign in again." };
  try {
    return await checkEmailCode(viewer, code);
  } catch (e) {
    console.error("check code failed", e);
    return { ok: false, error: "We could not check the code. Please try again." };
  }
}
