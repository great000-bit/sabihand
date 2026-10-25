"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "sabihand-theme";
type Theme = "light" | "dark";

const read = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** The theme lives on <html data-theme>, which the script in layout.tsx sets before first paint. */
function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

/** Light or dark. Starts from the device setting and remembers the person's choice on this device. */
export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, read, () => null);

  useEffect(() => {
    // Follow the device while the person has not chosen for themselves.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      try {
        if (localStorage.getItem(KEY)) return;
      } catch {}
      document.documentElement.dataset.theme = mq.matches ? "dark" : "light";
    };
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);

  function toggle() {
    const next: Theme = read() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {}
  }

  const dark = theme === "dark";
  return (
    <button type="button" onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"} className="flex h-10 w-10 flex-none items-center justify-center rounded-full border-2 border-line text-ink hover:border-ink">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
    </button>
  );
}
