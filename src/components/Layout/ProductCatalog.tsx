"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ProductCard } from "@/components/Elements/ProductCard";
import { ProductFilters } from "@/components/Elements/ProductFilters";
import { QuickViewModal } from "@/components/Elements/QuickViewModal";
import { ProductGridSkeleton } from "@/components/Elements/Skeleton";
import { EmptyState } from "@/components/Elements/EmptyState";
import { useStore } from "@/context/StoreContext";
import { filterProducts } from "@/lib/products";
import type { Product, ProductFilterState } from "@/lib/types";
import { SPRING_TRANSITION } from "@/lib/constants";

interface ProductCatalogProps {
  title: string;
  filterKey?: "newArrival" | "bestseller" | "all";
  initialCategory?: string;
  showFilters?: boolean;
}

export function ProductCatalog({
  title,
  filterKey = "all",
  initialCategory,
  showFilters = true,
}: ProductCatalogProps) {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") || initialCategory;
  const { products, loading } = useStore();
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [filters, setFilters] = useState<ProductFilterState>({
    category: categoryParam || undefined,
    sort: "newest",
  });

  const baseFiltered = useMemo(() => {
    let list = products;
    if (filterKey === "newArrival") list = list.filter((p) => p.newArrival);
    else if (filterKey === "bestseller") list = list.filter((p) => p.bestseller);
    return list;
  }, [products, filterKey]);

  const filtered = useMemo(
    () => filterProducts(baseFiltered, { ...filters, category: filters.category || categoryParam || undefined }),
    [baseFiltered, filters, categoryParam]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className="text-center mb-8"
      >
        <h1 className="font-script text-4xl md:text-5xl text-brand-charcoal">{title}</h1>
        <p className="text-brand-muted mt-2">{filtered.length} pieces available</p>
      </motion.div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        {showFilters && (
          <aside className="lg:sticky lg:top-28 h-fit">
            <ProductFilters
              products={baseFiltered}
              filters={filters}
              onChange={setFilters}
              showCategory={filterKey === "all"}
            />
          </aside>
        )}

        <div>
          {loading ? (
            <ProductGridSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your filters or browse our collections."
              actionLabel="Shop New Arrivals"
              actionHref="/new-arrivals"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((product, i) => (
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
