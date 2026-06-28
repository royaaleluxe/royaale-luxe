import type { Product, ProductFilterState } from "./types";
import type { ProductSize } from "./constants";
import { LOW_STOCK_THRESHOLD } from "./constants";

export function getTotalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + v.quantity, 0);
}

export function getStockForVariant(
  product: Product,
  color: string,
  size: ProductSize
): number {
  const variant = product.variants.find((v) => v.color === color && v.size === size);
  return variant?.quantity ?? 0;
}

export function getInventoryStatus(product: Product, color?: string, size?: ProductSize) {
  let qty: number;
  if (color && size) {
    qty = getStockForVariant(product, color, size);
  } else {
    qty = getTotalStock(product);
  }

  if (qty <= 0) return { label: "Sold Out", tone: "muted" as const };
  if (qty <= LOW_STOCK_THRESHOLD) return { label: `Only ${qty} Left`, tone: "warning" as const };
  return { label: "In Stock", tone: "success" as const };
}

export function getCardStockBadge(product: Product): {
  label: string;
  className: string;
} | null {
  const total = getTotalStock(product);
  if (total <= 0) {
    return { label: "Sold Out", className: "bg-gray-800/80 text-white" };
  }
  if (total <= LOW_STOCK_THRESHOLD) {
    return { label: "Low Stock", className: "bg-amber-500/90 text-white" };
  }
  return null;
}

export function getUniqueColors(
  product: Product
): Pick<import("./types").StockVariant, "color" | "colorHex" | "image">[] {
  const seen = new Set<string>();
  return product.variants
    .filter((v) => {
      if (seen.has(v.color)) return false;
      seen.add(v.color);
      return true;
    })
    .map((v) => ({
      color: v.color,
      colorHex: v.colorHex,
      image: v.image || product.variants.find((x) => x.color === v.color && x.image)?.image,
    }));
}

export function getImageForColor(product: Product, color: string): string {
  const match = getUniqueColors(product).find((c) => c.color === color);
  return match?.image || product.images[0] || "";
}

export function getAvailableSizes(product: Product, color: string): ProductSize[] {
  return product.variants
    .filter((v) => v.color === color && v.quantity > 0)
    .map((v) => v.size);
}

export function getProductCategories(products: Product[]): string[] {
  const cats = new Set<string>();
  for (const p of products) {
    if (p.category?.trim()) cats.add(p.category.trim());
  }
  return Array.from(cats).sort();
}

export function searchProducts(products: Product[], query: string): Product[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return products.filter((p) => {
    const haystack = [p.title, p.description, p.category, ...p.variants.map((v) => v.color)]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function filterProducts(products: Product[], filters: ProductFilterState): Product[] {
  let result = [...products];

  if (filters.category) {
    result = result.filter((p) => p.category === filters.category);
  }
  if (filters.minPrice != null) {
    result = result.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters.maxPrice != null) {
    result = result.filter((p) => p.price <= filters.maxPrice!);
  }
  if (filters.inStockOnly) {
    result = result.filter((p) => getTotalStock(p) > 0);
  }
  if (filters.sizes?.length) {
    result = result.filter((p) =>
      p.variants.some((v) => filters.sizes!.includes(v.size) && v.quantity > 0)
    );
  }
  if (filters.colors?.length) {
    result = result.filter((p) =>
      p.variants.some((v) => filters.colors!.includes(v.color) && v.quantity > 0)
    );
  }

  const sort = filters.sort || "newest";
  result.sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name":
        return a.title.localeCompare(b.title);
      case "newest":
      default:
        return (
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
    }
  });

  return result;
}

export function getRelatedProducts(product: Product, allProducts: Product[], limit = 4): Product[] {
  return allProducts
    .filter((p) => p.id !== product.id)
    .map((p) => {
      let score = 0;
      if (p.category === product.category) score += 3;
      if (p.bestseller) score += 1;
      if (p.featured) score += 1;
      const sharedColors = p.variants.filter((v) =>
        product.variants.some((pv) => pv.color === v.color)
      ).length;
      score += sharedColors;
      return { product: p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product: p }) => p);
}

export interface LowStockItem {
  productId: string;
  title: string;
  color: string;
  size: ProductSize;
  quantity: number;
}

export function getLowStockItems(products: Product[], threshold = LOW_STOCK_THRESHOLD): LowStockItem[] {
  const items: LowStockItem[] = [];
  for (const p of products) {
    for (const v of p.variants) {
      if (v.quantity > 0 && v.quantity <= threshold) {
        items.push({
          productId: p.id,
          title: p.title,
          color: v.color,
          size: v.size,
          quantity: v.quantity,
        });
      }
    }
  }
  return items.sort((a, b) => a.quantity - b.quantity);
}

export function mergeCartItems(
  local: import("./types").CartItem[],
  remote: import("./types").CartItem[]
): import("./types").CartItem[] {
  const map = new Map<string, import("./types").CartItem>();
  const key = (i: import("./types").CartItem) => `${i.productId}-${i.color}-${i.size}`;
  for (const item of remote) map.set(key(item), { ...item });
  for (const item of local) {
    const k = key(item);
    const existing = map.get(k);
    if (existing) {
      map.set(k, { ...existing, quantity: Math.max(existing.quantity, item.quantity) });
    } else {
      map.set(k, { ...item });
    }
  }
  return Array.from(map.values());
}
