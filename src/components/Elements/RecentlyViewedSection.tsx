"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "./ProductCard";
import { useStore } from "@/context/StoreContext";
import { getRecentlyViewedProducts } from "@/lib/recentlyViewed";
import { SPRING_TRANSITION } from "@/lib/constants";

export function RecentlyViewedSection() {
  const { products } = useStore();
  const recent = useMemo(() => getRecentlyViewedProducts(products), [products]);

  if (recent.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-6 py-12">
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={SPRING_TRANSITION}
        className="font-script text-3xl text-brand-charcoal text-center mb-8"
      >
        Recently Viewed
      </motion.h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {recent.slice(0, 4).map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}
