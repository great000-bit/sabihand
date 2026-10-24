import { cache } from "react";
import type { Viewer } from "@/lib/types";
import { authConfigured, getAuth } from "@/lib/auth/server";

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/**
 * The signed-in person, resolved on the server from the session cookie.
 * Admins are named in ADMIN_USER_IDS, or ADMIN_EMAILS when the address is verified.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!authConfigured) return null;
  try {
    const { data } = await getAuth().getSession();
    const u = data?.user;
    if (!u) return null;
    const email = String(u.email ?? "");
    const isAdmin = list(process.env.ADMIN_USER_IDS).includes(String(u.id).toLowerCase()) || (u.emailVerified === true && list(process.env.ADMIN_EMAILS).includes(email.toLowerCase()));
    return { id: String(u.id), name: String(u.name || email.split("@")[0] || "Customer"), email, isAdmin };
  } catch {
    return null;
  }
});
