"use client";

import { motion } from "framer-motion";
import { useUI } from "@/context/UIContext";

export function HamburgerMenu() {
  const { navOpen, setNavOpen } = useUI();

  return (
    <motion.button
      aria-label="Toggle navigation"
      className="relative w-10 h-10 flex flex-col items-center justify-center gap-1.5"
      onClick={() => setNavOpen(!navOpen)}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        className="block w-6 h-0.5 bg-brand-charcoal origin-center"
        animate={navOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      />
      <motion.span
        className="block w-6 h-0.5 bg-brand-charcoal"
        animate={navOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.2 }}
      />
      <motion.span
        className="block w-6 h-0.5 bg-brand-charcoal origin-center"
        animate={navOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      />
    </motion.button>
  );
}
