import { getViewer } from "@/server/session";
import { MAX_IMAGES_PER_USER, MAX_IMAGE_BYTES, countImages, isJpeg, saveImage } from "@/server/images";

export const dynamic = "force-dynamic";

/** Takes one small JPEG from a signed-in person and returns its id. Attaching it to a profile is a separate, checked step. */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "Sign in to upload photos." }, { status: 401 });
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_IMAGE_BYTES) return Response.json({ error: "That photo is too large." }, { status: 413 });
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) return Response.json({ error: "That photo is too large." }, { status: 413 });
  if (!isJpeg(bytes)) return Response.json({ error: "Upload a photo (JPEG or PNG)." }, { status: 415 });
  try {
    if ((await countImages(viewer.id)) >= MAX_IMAGES_PER_USER) return Response.json({ error: "You have reached the photo limit. Remove one first." }, { status: 429 });
    return Response.json({ id: await saveImage(viewer.id, bytes) });
  } catch (e) {
    console.error("image upload failed", e);
    return Response.json({ error: "Could not save the photo. Try again." }, { status: 500 });
  }
}
