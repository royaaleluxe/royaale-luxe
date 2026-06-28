import type { Product } from "./types";

const STORAGE_KEY = "royaale-recently-viewed";
const MAX_ITEMS = 8;

export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(productId: string): void {
  if (typeof window === "undefined") return;
  const ids = getRecentlyViewedIds().filter((id) => id !== productId);
  ids.unshift(productId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_ITEMS)));
}

export function getRecentlyViewedProducts(products: Product[]): Product[] {
  const ids = getRecentlyViewedIds();
  return ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => p !== undefined);
}
