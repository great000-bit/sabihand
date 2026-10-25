import { sql } from "./db";
import { newId } from "./ids";

export const MAX_IMAGE_BYTES = 900_000;
/** Profile photo plus the work gallery, with a little room for a photo that is being replaced. */
export const MAX_IMAGES_PER_USER = 14;

/** A real JPEG starts FF D8 FF. The browser sends JPEG only, so anything else is refused. */
export function isJpeg(b: Uint8Array): boolean {
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}

export async function countImages(ownerId: string): Promise<number> {
  const r = (await sql()`select count(*)::int as n from app.images where owner_id = ${ownerId}`) as { n: number }[];
  return r[0]?.n ?? 0;
}

export async function saveImage(ownerId: string, bytes: Uint8Array): Promise<string> {
  const id = newId("img");
  await sql()`insert into app.images (id, owner_id, mime, size, data) values (${id}, ${ownerId}, 'image/jpeg', ${bytes.length}, ${Buffer.from(bytes).toString("base64")})`;
  return id;
}

export async function readImage(id: string): Promise<{ mime: string; bytes: Buffer } | null> {
  const r = (await sql()`select mime, data from app.images where id = ${id} limit 1`) as { mime: string; data: string }[];
  return r[0] ? { mime: r[0].mime, bytes: Buffer.from(r[0].data, "base64") } : null;
}

export async function ownsImage(ownerId: string, id: string): Promise<boolean> {
  const r = (await sql()`select 1 from app.images where id = ${id} and owner_id = ${ownerId} limit 1`) as unknown[];
  return r.length > 0;
}

/** Deletes this person's photos that no longer belong to their profile. Photos from the last ten minutes are kept: they may be mid-upload. */
export async function pruneImages(ownerId: string): Promise<void> {
  const db = sql();
  const rows = (await db`select doc from app.artisans where owner_id = ${ownerId} limit 1`) as { doc: { photoId?: string; portfolio?: { imageId: string }[] } }[];
  const keep = [rows[0]?.doc.photoId, ...(rows[0]?.doc.portfolio ?? []).map((p) => p.imageId)].filter((x): x is string => Boolean(x));
  await db`delete from app.images where owner_id = ${ownerId} and created_at < now() - interval '10 minutes' and not (id = any(${keep}))`;
}
