"use client";

import { Suspense } from "react";
import { ProductCatalog } from "@/components/Layout/ProductCatalog";
import { getProductCategories } from "@/lib/products";
import { useStore } from "@/context/StoreContext";
import Link from "next/link";
import { motion } from "framer-motion";
import { SPRING_TRANSITION } from "@/lib/constants";

function CategoryNav() {
  const { products } = useStore();
  const categories = getProductCategories(products);

  if (categories.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
      <div className="flex flex-wrap gap-2 justify-center">
        <Link href="/collections">
          <motion.span
            className="px-4 py-2 rounded-full text-sm font-semibold bg-brand-charcoal text-white"
            whileTap={{ scale: 0.98 }}
          >
            All
          </motion.span>
        </Link>
        {categories.map((cat) => (
          <Link key={cat} href={`/collections?category=${encodeURIComponent(cat)}`}>
            <motion.span
              className="px-4 py-2 rounded-full text-sm font-semibold bg-brand-pink-accent/50 text-brand-charcoal hover:bg-brand-pink-accent/80"
              whileTap={{ scale: 0.98 }}
              transition={SPRING_TRANSITION}
            >
              {cat}
            </motion.span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CollectionsContent() {
  return (
    <>
      <CategoryNav />
      <ProductCatalog title="Collections" filterKey="all" showFilters />
    </>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-brand-muted">Loading...</div>}>
      <CollectionsContent />
    </Suspense>
  );
}
