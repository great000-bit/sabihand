import { cache } from "react";
import type { Viewer } from "@/lib/types";
import { authConfigured, getAuth } from "@/lib/auth/server";
import { dbConfigured, sql } from "./db";

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

/**
 * The signed-in person, resolved on the server from the session cookie.
 * Super admins are named in SUPER_ADMIN_USER_IDS. Admins are those a super admin added (app.admins), plus anyone in
 * ADMIN_USER_IDS, or ADMIN_EMAILS when the address is verified. A super admin is always an admin.
 */
async function addedAsAdmin(id: string): Promise<boolean> {
  if (!dbConfigured) return false;
  try {
    const r = (await sql()`select 1 from app.admins where user_id = ${id} limit 1`) as unknown[];
    return r.length > 0;
  } catch {
    return false; // the table may not exist yet; nobody is an admin then
  }
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!authConfigured) return null;
  try {
    const { data } = await getAuth().getSession();
    const u = data?.user;
    if (!u) return null;
    const email = String(u.email ?? "");
    const id = String(u.id);
    const isSuperAdmin = list(process.env.SUPER_ADMIN_USER_IDS).includes(id.toLowerCase());
    const isAdmin = isSuperAdmin || list(process.env.ADMIN_USER_IDS).includes(id.toLowerCase()) || (u.emailVerified === true && list(process.env.ADMIN_EMAILS).includes(email.toLowerCase())) || (await addedAsAdmin(id));
    return { id, name: String(u.name || email.split("@")[0] || "Customer"), email, isAdmin, isSuperAdmin };
  } catch {
    return null;
  }
});
