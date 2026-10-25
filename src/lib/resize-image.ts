/** Shrinks a photo in the browser to a JPEG small enough to upload: longest side `max` px, or a centred square when `square` is set. */
export async function resizeToJpeg(file: File, opts: { max: number; square?: boolean }): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo (JPEG or PNG).");
  if (file.size > 25_000_000) throw new Error("That photo is too large. Choose one under 25 MB.");
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error("We could not read that photo. Try a JPEG or PNG.");
  const { width: w, height: h } = bmp;
  const side = Math.min(w, h);
  const src = opts.square ? { x: (w - side) / 2, y: (h - side) / 2, w: side, h: side } : { x: 0, y: 0, w, h };
  const scale = Math.min(1, opts.max / Math.max(src.w, src.h));
  const cw = Math.max(1, Math.round(src.w * scale));
  const ch = Math.max(1, Math.round(src.h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process the photo.");
  ctx.fillStyle = "#ffffff"; // PNGs with transparency become white, not black
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(bmp, src.x, src.y, src.w, src.h, 0, 0, cw, ch);
  bmp.close();
  for (const q of [0.85, 0.75, 0.65, 0.5]) {
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
    if (blob && blob.size <= 850_000) return blob;
  }
  throw new Error("That photo is still too large after shrinking. Choose another.");
}

/** Uploads a resized photo and returns its id, or throws a message fit to show. */
export async function uploadPhoto(file: File, opts: { max: number; square?: boolean }): Promise<string> {
  const blob = await resizeToJpeg(file, opts);
  const res = await fetch("/api/images", { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
  const body = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
  if (!res.ok || !body?.id) throw new Error(body?.error ?? "Could not upload the photo. Try again.");
  return body.id;
}
