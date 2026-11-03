/**
 * Admin password rules, after NIST SP 800-63B: length matters most, so at least 15 characters (a few ordinary words
 * make a strong passphrase), no forced symbol mixes, and nothing guessable from the account or the site.
 */
export const MIN_PASSWORD = 15;
export const MAX_PASSWORD = 128;

const COMMON = ["password", "passw0rd", "qwerty", "123456", "abc123", "letmein", "welcome", "admin", "iloveyou", "sabihand", "monkey", "dragon", "football"];

export function passwordProblem(pw: string, email = ""): string | null {
  if (pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters. A few unrelated words make a strong, easy to remember passphrase.`;
  if (pw.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`;
  const lower = pw.toLowerCase();
  if (new Set(lower).size < 6) return "That password repeats too few different characters.";
  const local = email.toLowerCase().split("@")[0];
  if (local.length >= 4 && lower.includes(local)) return "Do not use your email address in your password.";
  if (COMMON.some((w) => lower.includes(w))) return "That password contains a very common word or pattern. Choose something less guessable.";
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf)/.test(lower)) return "Avoid simple runs like 1234 or abcd.";
  return null;
}
