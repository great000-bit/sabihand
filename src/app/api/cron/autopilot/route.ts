import { runAutopilot } from "@/server/autopilot";

export const dynamic = "force-dynamic";

/**
 * Daily safety run from Vercel Cron (vercel.json), for payouts whose waiting time ends when nobody is using the site.
 * With CRON_SECRET set, Vercel sends it as a bearer token and nothing else may start a run.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const r = await runAutopilot("daily cron");
  return Response.json(r);
}
