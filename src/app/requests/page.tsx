import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { isArtisanAccount } from "@/server/roles";
import Requests from "./list";

export const metadata = { title: "My requests" };

/** A customer's own bookings. Artisan accounts see their jobs on their dashboard. */
export default async function Page() {
  const v = await getViewer();
  if (v && !v.isAdmin && (await isArtisanAccount(v.id))) redirect("/artisan");
  return <Requests />;
}
