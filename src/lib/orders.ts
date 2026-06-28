import type { CartItem, Product, StockVariant } from "./types";
import type { ProductSize } from "./constants";
import { getStockForVariant } from "./products";

export interface StockValidationError {
  productId: string;
  title: string;
  color: string;
  size: string;
  requested: number;
  available: number;
}

export function validateItemsAgainstProduct(
  items: CartItem[],
  products: Product[]
): StockValidationError[] {
  const errors: StockValidationError[] = [];
  for (const item of items) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      errors.push({
        productId: item.productId,
        title: item.title,
        color: item.color,
        size: item.size,
        requested: item.quantity,
        available: 0,
      });
      continue;
    }
    const available = getStockForVariant(product, item.color, item.size as ProductSize);
    if (available < item.quantity) {
      errors.push({
        productId: item.productId,
        title: item.title,
        color: item.color,
        size: item.size,
        requested: item.quantity,
        available,
      });
    }
  }
  return errors;
}

export function buildVariantUpdates(
  items: CartItem[],
  products: Map<string, Product>
): { productId: string; variants: StockVariant[] }[] {
  const updates: { productId: string; variants: StockVariant[] }[] = [];
  const grouped = new Map<string, CartItem[]>();

  for (const item of items) {
    const list = grouped.get(item.productId) || [];
    list.push(item);
    grouped.set(item.productId, list);
  }

  for (const [productId, cartItems] of Array.from(grouped.entries())) {
    const product = products.get(productId);
    if (!product) throw new Error(`Product ${productId} not found`);
    const variants = product.variants.map((v) => ({ ...v }));
    for (const item of cartItems) {
      const idx = variants.findIndex((v) => v.color === item.color && v.size === item.size);
      if (idx < 0 || variants[idx].quantity < item.quantity) {
        throw new Error(
          `Insufficient stock for ${item.title} (${item.color}/${item.size})`
        );
      }
      variants[idx].quantity -= item.quantity;
    }
    updates.push({ productId, variants });
  }

  return updates;
}

export function buildVariantRestores(
  items: CartItem[],
  products: Map<string, Product>
): { productId: string; variants: StockVariant[] }[] {
  const grouped = new Map<string, CartItem[]>();
  for (const item of items) {
    const list = grouped.get(item.productId) || [];
    list.push(item);
    grouped.set(item.productId, list);
  }

  const updates: { productId: string; variants: StockVariant[] }[] = [];
  for (const [productId, cartItems] of Array.from(grouped.entries())) {
    const product = products.get(productId);
    if (!product) continue;
    const variants = product.variants.map((v) => ({ ...v }));
    for (const item of cartItems) {
      const idx = variants.findIndex((v) => v.color === item.color && v.size === item.size);
      if (idx >= 0) {
        variants[idx].quantity += item.quantity;
      } else {
        variants.push({
          color: item.color,
          colorHex: item.colorHex,
          size: item.size,
          quantity: item.quantity,
          image: item.image,
        });
      }
    }
    updates.push({ productId, variants });
  }
  return updates;
}
