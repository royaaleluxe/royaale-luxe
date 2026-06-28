"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function MobileSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <>
      <button
        className="md:hidden p-2 rounded-full hover:bg-white/40"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="w-5 h-5 text-brand-charcoal" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-[80] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.form
              onSubmit={submit}
              className="fixed top-20 left-4 right-4 z-[90] md:hidden flex gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 px-4 py-3 rounded-full bg-white shadow-glass border border-white/30 text-sm"
              />
              <button type="button" onClick={() => setOpen(false)} className="p-3 bg-white rounded-full shadow">
                <X className="w-5 h-5" />
              </button>
            </motion.form>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
