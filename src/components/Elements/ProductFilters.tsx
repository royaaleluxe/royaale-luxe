"use client";

import { useMemo } from "react";
import type { ProductFilterState } from "@/lib/types";
import type { ProductSize } from "@/lib/constants";
import { PRODUCT_SIZES } from "@/lib/constants";
import { getProductCategories } from "@/lib/products";
import type { Product } from "@/lib/types";

interface ProductFiltersProps {
  products: Product[];
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
  showCategory?: boolean;
}

export function ProductFilters({
  products,
  filters,
  onChange,
  showCategory = true,
}: ProductFiltersProps) {
  const categories = useMemo(() => getProductCategories(products), [products]);
  const colors = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.variants.forEach((v) => set.add(v.color)));
    return Array.from(set).sort();
  }, [products]);

  const priceRange = useMemo(() => {
    if (!products.length) return { min: 0, max: 500 };
    return {
      min: Math.floor(Math.min(...products.map((p) => p.price))),
      max: Math.ceil(Math.max(...products.map((p) => p.price))),
    };
  }, [products]);

  const update = (partial: Partial<ProductFilterState>) => {
    onChange({ ...filters, ...partial });
  };

  const toggleSize = (size: ProductSize) => {
    const current = filters.sizes || [];
    const next = current.includes(size)
      ? current.filter((s) => s !== size)
      : [...current, size];
    update({ sizes: next.length ? next : undefined });
  };

  const toggleColor = (color: string) => {
    const current = filters.colors || [];
    const next = current.includes(color)
      ? current.filter((c) => c !== color)
      : [...current, color];
    update({ colors: next.length ? next : undefined });
  };

  return (
    <div className="space-y-4 p-4 rounded-2xl bg-white/40 border border-white/30">
      {showCategory && categories.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">Category</p>
          <select
            value={filters.category || ""}
            onChange={(e) => update({ category: e.target.value || undefined })}
            className="w-full px-3 py-2 rounded-xl bg-white/60 border border-white/40 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">Sort</p>
        <select
          value={filters.sort || "newest"}
          onChange={(e) => update({ sort: e.target.value as ProductFilterState["sort"] })}
          className="w-full px-3 py-2 rounded-xl bg-white/60 border border-white/40 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">Price range</p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={filters.minPrice ?? ""}
            onChange={(e) =>
              update({ minPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full px-3 py-2 rounded-xl bg-white/60 border border-white/40 text-sm"
          />
          <span className="text-brand-muted">–</span>
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              update({ maxPrice: e.target.value ? Number(e.target.value) : undefined })
            }
            className="w-full px-3 py-2 rounded-xl bg-white/60 border border-white/40 text-sm"
          />
        </div>
        <p className="text-[10px] text-brand-muted mt-1">
          {priceRange.min} – {priceRange.max} XCD
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">Size</p>
        <div className="flex flex-wrap gap-1.5">
          {PRODUCT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => toggleSize(size)}
              className={`px-2.5 py-1 text-xs rounded-full border ${
                filters.sizes?.includes(size)
                  ? "bg-brand-charcoal text-white border-brand-charcoal"
                  : "border-brand-pink-accent/40"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {colors.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => toggleColor(color)}
                className={`px-2.5 py-1 text-xs rounded-full border ${
                  filters.colors?.includes(color)
                    ? "bg-brand-charcoal text-white border-brand-charcoal"
                    : "border-brand-pink-accent/40"
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.inStockOnly ?? false}
          onChange={(e) => update({ inStockOnly: e.target.checked || undefined })}
        />
        In stock only
      </label>

      {(filters.category ||
        filters.minPrice ||
        filters.maxPrice ||
        filters.sizes?.length ||
        filters.colors?.length ||
        filters.inStockOnly) && (
        <button
          type="button"
          onClick={() => onChange({ sort: filters.sort })}
          className="text-xs font-semibold text-brand-pink-accent hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
