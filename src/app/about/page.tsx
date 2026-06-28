"use client";

import { motion } from "framer-motion";
import { SPRING_TRANSITION, GLASS_CLASS } from "@/lib/constants";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className={`${GLASS_CLASS} rounded-3xl p-10 md:p-14 text-center`}
      >
        <h1 className="font-script text-5xl text-brand-charcoal mb-6">About Us</h1>
        <p className="text-brand-muted leading-relaxed mb-6">
          Royaale Luxe was founded in the heart of Castries with a singular vision: to dress the
          modern Saint Lucian in garments that honour our island heritage while embracing global
          luxury standards.
        </p>
        <p className="text-brand-muted leading-relaxed">
          Every collection is thoughtfully curated — from breathable linens for Rodney Bay afternoons
          to dramatic evening wear inspired by the Pitons at dusk. We believe true luxury is
          personal, local, and unforgettable.
        </p>
      </motion.div>
    </div>
  );
}
