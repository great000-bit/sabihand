export class TimeoutError extends Error {}

/** Rejects if `work` takes longer than `ms`, so a slow auth service can never hang a page. */
export function withTimeout<T>(work: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`${what} took longer than ${ms} ms`)), ms);
  });
  return Promise.race([work, late]).finally(() => clearTimeout(timer));
}

/** How long a page waits for the auth service before it carries on as signed out. */
export const AUTH_WAIT_MS = 3000;

/**
 * After the auth service times out, skip it for a short while so every page does not wait the full time again.
 * Pages then load at normal speed as signed out, and sign-in works again as soon as the service answers.
 */
const PAUSE_MS = 20_000;
let pausedUntil = 0;
export const authPaused = (now = Date.now()) => now < pausedUntil;
export const pauseAuth = (now = Date.now()) => { pausedUntil = now + PAUSE_MS; };
export const resumeAuth = () => { pausedUntil = 0; };
