import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Reset your password" };

export default async function Page() {
  if (await getViewer()) redirect("/artisans");
  return <ForgotPasswordForm />;
}
