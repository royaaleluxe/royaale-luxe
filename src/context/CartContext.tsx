"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { CartItem } from "@/lib/types";
import { syncUserCart } from "@/lib/firestore";
import { mergeCartItems } from "@/lib/products";
import { useAuth } from "./AuthContext";

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, color: string, size: string) => void;
  updateQuantity: (productId: string, color: string, size: string, quantity: number) => void;
  moveToWishlist: (item: CartItem) => Promise<void>;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  selectedDistrict: string;
  setSelectedDistrict: (district: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "royaale-luxe-cart";
const DISTRICT_KEY = "royaale-selected-district";

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedDistrict, setSelectedDistrictState] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const syncTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mergedRemote = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
      const district = localStorage.getItem(DISTRICT_KEY);
      if (district) setSelectedDistrictState(district);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !user || !profile || mergedRemote.current) return;
    const remote = profile.savedCart || [];
    if (remote.length > 0) {
      setItems((local) => mergeCartItems(local, remote));
    }
    mergedRemote.current = true;
  }, [hydrated, user, profile]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    if (user) {
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
      syncTimeout.current = setTimeout(() => {
        syncUserCart(user.uid, items).catch(() => {});
      }, 800);
    }
  }, [items, hydrated, user]);

  const setSelectedDistrict = useCallback((district: string) => {
    setSelectedDistrictState(district);
    if (typeof window !== "undefined") {
      localStorage.setItem(DISTRICT_KEY, district);
    }
  }, []);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.productId === item.productId && i.color === item.color && i.size === item.size
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
        return next;
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((productId: string, color: string, size: string) => {
    setItems((prev) =>
      prev.filter((i) => !(i.productId === productId && i.color === color && i.size === size))
    );
  }, []);

  const updateQuantity = useCallback(
    (productId: string, color: string, size: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, color, size);
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          i.productId === productId && i.color === color && i.size === size
            ? { ...i, quantity }
            : i
        )
      );
    },
    [removeItem]
  );

  const clearCart = useCallback(() => setItems([]), []);

  const moveToWishlist = useCallback(
    async (item: CartItem) => {
      if (!user) throw new Error("Sign in required");
      const { toggleWishlistItem } = await import("@/lib/wishlist");
      await toggleWishlistItem(user.uid, profile?.savedWishlist || [], item.productId);
      removeItem(item.productId, item.color, item.size);
    },
    [user, profile?.savedWishlist, removeItem]
  );

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        moveToWishlist,
        clearCart,
        subtotal,
        itemCount,
        selectedDistrict,
        setSelectedDistrict,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
