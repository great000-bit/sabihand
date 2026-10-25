"use client";

import { motion, useReducedMotion } from "framer-motion";
import { SearchForm } from "./search-form";
import { LiveStrip } from "./live-strip";

const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } } };

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <motion.div className="mx-auto max-w-3xl text-center" initial={reduce ? "show" : "hidden"} animate="show" transition={{ staggerChildren: 0.12 }}>
      <motion.h1 variants={item} className="text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
        What do you need <span className="bg-gradient-to-r from-trust to-[#17a2c4] bg-clip-text text-transparent">fixed</span> today?
      </motion.h1>
      <motion.p variants={item} className="mx-auto mt-5 max-w-xl text-base text-slate sm:text-lg">
        Find a verified plumber, electrician, tailor or carpenter near you. See the price first, and pay into a hold that is released only when you confirm the job.
      </motion.p>
      <motion.div variants={item} className="mx-auto mt-8 max-w-2xl">
        <SearchForm />
        <LiveStrip />
      </motion.div>
    </motion.div>
  );
}
