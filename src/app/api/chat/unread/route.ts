import { getViewer } from "@/server/session";
import { unreadByBooking } from "@/server/chat";

export const dynamic = "force-dynamic";

/** Unread chat messages per request, for the badges in the menu and the request lists. */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ byBooking: {}, total: 0 });
  try {
    const byBooking = await unreadByBooking(viewer.id);
    return Response.json({ byBooking, total: Object.values(byBooking).reduce((a, b) => a + b, 0) });
  } catch (e) {
    console.error("unread failed", e);
    return Response.json({ byBooking: {}, total: 0 });
  }
}
