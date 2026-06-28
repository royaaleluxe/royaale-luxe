"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HeroBanner } from "@/components/Layout/HeroBanner";
import { ProductCard } from "@/components/Elements/ProductCard";
import { QuickViewModal } from "@/components/Elements/QuickViewModal";
import { ProductGridSkeleton, HeroSkeleton } from "@/components/Elements/Skeleton";
import { useStore } from "@/context/StoreContext";
import type { Product } from "@/lib/types";
import { SPRING_TRANSITION } from "@/lib/constants";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

export default function HomePage() {
  const { products, settings, loading } = useStore();
  const [quickView, setQuickView] = useState<Product | null>(null);
  const highlighted = products.filter((p) => p.featured || p.newArrival);
  const featured = (highlighted.length > 0 ? highlighted : products).slice(0, 8);

  return (
    <div className="pb-12">
      {loading ? <HeroSkeleton /> : <HeroBanner settings={settings} />}

      <section className="max-w-7xl mx-auto px-4 md:px-6 mt-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_TRANSITION}
          className="text-center mb-12"
        >
          <h2 className="font-script text-4xl md:text-5xl text-brand-charcoal mb-3">
            Curated Collection
          </h2>
          <p className="text-brand-muted max-w-lg mx-auto">
            {settings?.heroText || "Discover pieces crafted for the discerning island wardrobe."}
          </p>
        </motion.div>

        {loading ? (
          <ProductGridSkeleton />
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {featured.length === 0 ? (
              <p className="col-span-full text-center text-brand-muted py-12">
                No products yet. Add items in the admin portal.
              </p>
            ) : (
              featured.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  onQuickView={() => setQuickView(product)}
                />
              ))
            )}
          </motion.div>
        )}
      </section>

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}
