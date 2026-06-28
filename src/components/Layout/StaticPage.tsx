"use client";

import { motion } from "framer-motion";
import { SPRING_TRANSITION, GLASS_CLASS } from "@/lib/constants";

export function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className={`${GLASS_CLASS} rounded-3xl p-10 md:p-14`}
      >
        <h1 className="font-script text-4xl text-brand-charcoal mb-6">{title}</h1>
        <div className="text-brand-muted leading-relaxed">{children}</div>
      </motion.div>
    </div>
  );
}
