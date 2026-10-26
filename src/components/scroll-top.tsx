"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Every page opens at the top. The browser would otherwise bring back the place a person had scrolled to (often the
 * footer) when a page is reloaded or reached again, and Next keeps the scroll position when a page swaps in place.
 * A link to a part of a page (like /#how-it-works) still goes to that part.
 */
export function ScrollTop() {
  const path = usePathname();
  const query = useSearchParams().toString();
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [path, query]);
  return null;
}
