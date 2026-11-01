import type { ReactNode } from "react";
import { SignedInOnly } from "@/components/gate";
import { AdminShell } from "./shell";

export const metadata = { title: "Admin" };

/** Every /admin page shares the dashboard frame: the main site header and footer never show here. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SignedInOnly title="Sign in to the admin area">
      <AdminShell>{children}</AdminShell>
    </SignedInOnly>
  );
}
