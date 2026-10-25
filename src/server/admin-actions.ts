"use server";

import { revalidatePath } from "next/cache";
import { sql } from "./db";
import { getViewer } from "./session";

export interface AdminRow {
  userId: string;
  name: string;
  email: string;
  /** Super admins come from the site's settings and cannot be removed here. */
  super: boolean;
  addedAt?: string;
}

const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const NOT_ALLOWED = "Only a super admin can do that.";

async function superAdmin() {
  const v = await getViewer();
  return v?.isSuperAdmin ? v : null;
}

/** Everyone with admin access: the super admins first, then the people they added. */
export async function listAdmins(): Promise<{ error: string | null; admins: AdminRow[] }> {
  if (!(await superAdmin())) return { error: NOT_ALLOWED, admins: [] };
  try {
    const db = sql();
    const supers = list(process.env.SUPER_ADMIN_USER_IDS);
    const added = (await db`select user_id, name, email, created_at from app.admins order by created_at asc`) as { user_id: string; name: string; email: string; created_at: string }[];
    const known = supers.length ? ((await db`select id::text as id, name, email from neon_auth."user" where id::text = any(${supers})`) as { id: string; name: string; email: string }[]) : [];
    return {
      error: null,
      admins: [
        ...known.map((u) => ({ userId: u.id, name: u.name, email: u.email, super: true })),
        ...added.filter((a) => !supers.includes(a.user_id.toLowerCase())).map((a) => ({ userId: a.user_id, name: a.name, email: a.email, super: false, addedAt: new Date(a.created_at).toISOString() })),
      ],
    };
  } catch (e) {
    console.error("list admins failed", e);
    return { error: "Could not load the admin list.", admins: [] };
  }
}

/** Makes an existing account an admin. The person has to have signed up already. */
export async function addAdmin(email: string): Promise<{ error: string | null }> {
  const me = await superAdmin();
  if (!me) return { error: NOT_ALLOWED };
  const e = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 200) return { error: "Enter a valid email address." };
  try {
    const db = sql();
    const found = (await db`select id::text as id, name, email from neon_auth."user" where lower(email) = ${e} limit 1`) as { id: string; name: string; email: string }[];
    if (found.length === 0) return { error: "No account uses that email yet. Ask them to create an account first, then add them here." };
    const u = found[0];
    if (list(process.env.SUPER_ADMIN_USER_IDS).includes(u.id.toLowerCase())) return { error: "That person is already a super admin." };
    await db`insert into app.admins (user_id, email, name, added_by) values (${u.id}, ${u.email}, ${u.name}, ${me.id}) on conflict (user_id) do nothing`;
    revalidatePath("/", "layout");
    return { error: null };
  } catch (err) {
    console.error("add admin failed", err);
    return { error: "Could not add that admin. Try again." };
  }
}

export async function removeAdmin(userId: string): Promise<{ error: string | null }> {
  if (!(await superAdmin())) return { error: NOT_ALLOWED };
  const id = String(userId ?? "").trim();
  if (!id) return { error: "Choose who to remove." };
  if (list(process.env.SUPER_ADMIN_USER_IDS).includes(id.toLowerCase())) return { error: "A super admin cannot be removed here." };
  try {
    await sql()`delete from app.admins where user_id = ${id}`;
    revalidatePath("/", "layout");
    return { error: null };
  } catch (err) {
    console.error("remove admin failed", err);
    return { error: "Could not remove that admin. Try again." };
  }
}
