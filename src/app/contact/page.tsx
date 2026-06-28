"use client";

import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";
import { SPRING_TRANSITION, GLASS_CLASS } from "@/lib/constants";

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className={`${GLASS_CLASS} rounded-3xl p-10 md:p-14`}
      >
        <h1 className="font-script text-5xl text-brand-charcoal text-center mb-10">Contact</h1>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <MapPin className="w-5 h-5 text-brand-muted" />
            <span>Castries, Saint Lucia</span>
          </div>
          <div className="flex items-center gap-4">
            <Mail className="w-5 h-5 text-brand-muted" />
            <a href="mailto:royaaleluxe@gmail.com" className="hover:text-black">
              royaaleluxe@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Phone className="w-5 h-5 text-brand-muted" />
            <a href="https://wa.me/17581234567" className="hover:text-black">
              WhatsApp: +1 (758) 123-4567
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
