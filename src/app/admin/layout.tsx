import type { ReactNode } from "react";
import { getViewer } from "@/server/session";
import { readAdminSession } from "@/server/admin-auth/guard";
import { AdminShell } from "./shell";
import { AdminSignIn, ForcePasswordChange, NotAdmin } from "./gate";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };

/**
 * The admin area opens only with an admin session (email + password, plus a code when 2FA is on). A Google sign-in,
 * even for an admin's own account, gets the sign-in form. Every admin action re-checks this on the server.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await readAdminSession();
  if (!session) return <AdminSignIn />;
  if (session.mustChange) return <ForcePasswordChange email={session.email} />;
  const viewer = await getViewer();
  if (!viewer?.isAdmin) return <NotAdmin />;
  return <AdminShell>{children}</AdminShell>;
}
