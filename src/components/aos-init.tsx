"use client";

import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect } from "react";

/** Scroll reveals for the marketing pages. Marked elements use data-aos. Skipped for reduced motion. */
export function AosInit() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    AOS.init({ duration: 700, easing: "ease-out-cubic", once: true, offset: 60, disable: reduced });
  }, []);
  return null;
}
