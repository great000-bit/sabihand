import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { emailConfirmed } from "@/server/email-check";
import { askedFor } from "@/lib/auth/next";
import { VerifyEmailForm } from "@/components/verify-email-form";

export const metadata = { title: "Confirm your email" };
export const dynamic = "force-dynamic";

/** Step after an email sign-up: type the 6-digit code from the email. /continue sends people here until it's done. */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next, as } = await searchParams;
  const q = new URLSearchParams();
  const want = askedFor(next);
  if (want) q.set("next", want);
  if (as === "artisan") q.set("as", "artisan");
  const onward = `/continue${q.size ? `?${q}` : ""}`;
  const viewer = await getViewer();
  if (!viewer) redirect(`/auth/sign-in${q.size ? `?${q}` : ""}`);
  if (await emailConfirmed(viewer.id)) redirect(onward);
  return <VerifyEmailForm email={viewer.email} onward={onward} />;
}
