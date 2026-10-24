import { neon } from "@neondatabase/serverless";

export const dbConfigured = Boolean(process.env.DATABASE_URL);

let client: ReturnType<typeof neon> | null = null;

/** Neon over HTTPS: one round trip per query, safe in serverless functions. */
export function sql() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
