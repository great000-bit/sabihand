import { dbConfigured, sql } from "./db";

/** True when this account has an artisan profile. An account is either an artisan (takes jobs) or a customer (books). */
export async function isArtisanAccount(userId: string): Promise<boolean> {
  if (!dbConfigured) return false;
  try {
    return ((await sql()`select 1 from app.artisans where owner_id = ${userId} limit 1`) as unknown[]).length > 0;
  } catch {
    return false;
  }
}
