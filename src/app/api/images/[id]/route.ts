import { readImage } from "@/server/images";

export const dynamic = "force-dynamic";

/** Profile and work photos are public. Ids are random and a photo never changes, so browsers may keep it forever. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^img_[0-9a-f]{16}$/.test(id)) return new Response("not found", { status: 404 });
  try {
    const img = await readImage(id);
    if (!img) return new Response("not found", { status: 404 });
    return new Response(new Uint8Array(img.bytes), { headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("unavailable", { status: 503 });
  }
}
