"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import { ProductImage } from "@/components/Elements/ProductImage";
import { useStore } from "@/context/StoreContext";
import { searchProducts } from "@/lib/products";
import { formatCurrency, SPRING_TRANSITION } from "@/lib/constants";
import { getAvailableSizes } from "@/lib/products";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { products } = useStore();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const results = searchProducts(products, query).slice(0, 6);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative flex-1 max-w-xl mx-4 hidden md:block">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search luxury pieces..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white/60 border border-white/40 text-sm text-brand-charcoal placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
          />
        </div>
      </form>

      <AnimatePresence>
        {open && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={SPRING_TRANSITION}
            className="absolute top-full mt-2 w-full bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-glass overflow-hidden z-50"
          >
            {results.length === 0 ? (
              <p className="p-4 text-sm text-brand-muted">No products found</p>
            ) : (
              results.map((product) => {
                const sizes = getAvailableSizes(product, product.variants[0]?.color || "");
                return (
                  <motion.button
                    key={product.id}
                    className="w-full flex items-center gap-3 p-3 hover:bg-brand-pink/50 transition-colors text-left"
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(product.title)}`);
                      setOpen(false);
                    }}
                    whileHover={{ x: 4 }}
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <ProductImage src={product.images[0]} alt={product.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-charcoal truncate">{product.title}</p>
                      <p className="text-xs text-brand-muted">
                        Sizes: {sizes.join(", ") || "N/A"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-black">{formatCurrency(product.price)}</span>
                  </motion.button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
