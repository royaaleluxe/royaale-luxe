"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/Elements/ProductCard";
import { ProductFilters } from "@/components/Elements/ProductFilters";
import { QuickViewModal } from "@/components/Elements/QuickViewModal";
import { ProductGridSkeleton } from "@/components/Elements/Skeleton";
import { EmptyState } from "@/components/Elements/EmptyState";
import { useStore } from "@/context/StoreContext";
import { searchProducts, filterProducts } from "@/lib/products";
import type { Product, ProductFilterState } from "@/lib/types";
import { SPRING_TRANSITION } from "@/lib/constants";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const { products, loading } = useStore();
  const [filters, setFilters] = useState<ProductFilterState>({ sort: "newest" });
  const [quickView, setQuickView] = useState<Product | null>(null);

  const searched = useMemo(() => searchProducts(products, query), [products, query]);
  const results = useMemo(() => filterProducts(searched, filters), [searched, filters]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className="mb-8"
      >
        <h1 className="font-script text-4xl text-brand-charcoal">Search Results</h1>
        <p className="text-brand-muted mt-2">
          {loading ? "Searching..." : `${results.length} results for "${query}"`}
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        {query && (
          <aside className="lg:sticky lg:top-28 h-fit">
            <ProductFilters products={searched} filters={filters} onChange={setFilters} showCategory />
          </aside>
        )}

        <div>
          {loading ? (
            <ProductGridSkeleton />
          ) : !query ? (
            <EmptyState title="Enter a search term" description="Use the search bar to find luxury pieces." />
          ) : results.length === 0 ? (
            <EmptyState
              title="No products match your search"
              actionLabel="Browse Collections"
              actionHref="/collections"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {results.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  onQuickView={() => setQuickView(product)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <SearchResults />
    </Suspense>
  );
}
