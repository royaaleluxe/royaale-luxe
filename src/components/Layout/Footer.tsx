"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Instagram, Facebook } from "lucide-react";
import { subscribeNewsletterViaApi } from "@/lib/api-client";
import { useToast } from "@/context/ToastContext";
import { SPRING_TRANSITION } from "@/lib/constants";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const result = await subscribeNewsletterViaApi(email.trim());
      showToast(result.message, "success");
      setEmail("");
    } catch {
      showToast("Subscription failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="mt-20 border-t border-brand-pink-accent/50 bg-brand-pink-accent/60 text-brand-charcoal">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <h3 className="font-script text-3xl mb-4 text-brand-charcoal">Royaale Luxe</h3>
            <p className="text-brand-charcoal/80 text-sm leading-relaxed">
              Born in Vieux-Fort, crafted for the island&apos;s elite. Royaale Luxe merges island
              sophistication with couture precision - every piece a statement of refined living; Thee
              Royaale Way!
            </p>
          </div>

          <div>
            <h4 className="font-sans font-semibold uppercase tracking-wider text-sm mb-4 text-brand-charcoal">
              Customer Concierge
            </h4>
            <ul className="space-y-2 text-sm text-brand-charcoal/80">
              <li>
                <Link href="/size-guide" className="hover:text-brand-charcoal transition-colors">
                  Size Guides
                </Link>
              </li>
              <li>
                <Link href="/returns" className="hover:text-brand-charcoal transition-colors">
                  Return Policies
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand-charcoal transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-brand-charcoal transition-colors">
                  Shipping Timelines
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans font-semibold uppercase tracking-wider text-sm mb-4 text-brand-charcoal">
              Direct Communication
            </h4>
            <ul className="space-y-2 text-sm text-brand-charcoal/80">
              <li>Vieux-Fort, Saint Lucia</li>
              <li>
                <a
                  href="https://wa.me/17581234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-brand-charcoal transition-colors"
                >
                  WhatsApp Support
                </a>
              </li>
              <li>
                <a href="mailto:royaaleluxe@gmail.com" className="hover:text-brand-charcoal transition-colors">
                  royaaleluxe@gmail.com
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-sans font-semibold uppercase tracking-wider text-sm mb-4 text-brand-charcoal">
              Exclusives Newsletter
            </h4>
            <form onSubmit={handleNewsletter} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-2.5 rounded-full bg-white border border-brand-pink-accent/60 text-sm text-brand-charcoal placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-charcoal/20"
              />
              <motion.button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-brand-charcoal text-white rounded-full text-sm font-semibold whitespace-nowrap disabled:opacity-50"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING_TRANSITION}
              >
                Join the Club
              </motion.button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-brand-charcoal/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-4">
            {[
              { Icon: Instagram, href: "https://www.instagram.com/royaale.luxe/" },
              { Icon: TikTokIcon, href: "https://tiktok.com" },
              { Icon: Facebook, href: "https://facebook.com" },
            ].map(({ Icon, href }, i) => (
              <motion.a
                key={i}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/70 text-brand-charcoal hover:bg-white transition-colors"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className="w-5 h-5" />
              </motion.a>
            ))}
          </div>
          <p className="text-sm text-brand-charcoal/70">
            © {new Date().getFullYear()} Royaale Luxe. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
