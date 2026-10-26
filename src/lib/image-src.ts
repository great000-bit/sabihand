/** Where to load a stored photo from: uploaded photos live in the database, sample profiles point at a file under /public. */
export function imageSrc(id: string): string {
  return id.startsWith("/") ? id : `/api/images/${id}`;
}
