/** Nigerian mobile numbers: 0 or +234 followed by 7/8/9 + 0/1 + 8 digits. Returns the +234 form, or null. */
export function normalisePhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, "");
  const m = /^(?:\+?234|0)([789][01]\d{8})$/.exec(digits);
  return m ? `+234${m[1]}` : null;
}
