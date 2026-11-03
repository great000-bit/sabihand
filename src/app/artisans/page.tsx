import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";
import { isArtisanAccount } from "@/server/roles";
import ArtisansPage from "./search";

export const metadata = { title: "Find artisans" };

/** Searching for artisans is for customers. An artisan account goes to its own dashboard instead. */
export default async function Page() {
  const v = await getViewer();
  if (v && !v.isAdmin && (await isArtisanAccount(v.id))) redirect("/artisan");
  return <ArtisansPage />;
}
