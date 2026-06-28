"use client";

import { Bell, BellOff } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "@/lib/types";
import type { ProductSize } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useToast } from "@/context/ToastContext";
import { addBackInStockAlert, removeBackInStockAlert } from "@/lib/firestore";
import { getStockForVariant } from "@/lib/products";
import { SPRING_TRANSITION } from "@/lib/constants";

interface BackInStockButtonProps {
  product: Product;
  color: string;
  size: ProductSize;
}

export function BackInStockButton({ product, color, size }: BackInStockButtonProps) {
  const { user, profile } = useAuth();
  const { openAuthModal } = useUI();
  const { showToast } = useToast();
  const stock = getStockForVariant(product, color, size);

  const isSubscribed = profile?.backInStockAlerts?.some(
    (a) => a.productId === product.id && a.color === color && a.size === size
  );

  if (stock > 0) return null;

  const handleClick = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    try {
      if (isSubscribed) {
        await removeBackInStockAlert(user.uid, product.id, color, size);
        showToast("Alert removed", "success");
      } else {
        await addBackInStockAlert(user.uid, { productId: product.id, color, size });
        showToast("We'll notify you when it's back", "success");
      }
    } catch {
      showToast("Failed to update alert", "error");
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className="w-full py-3 border-2 border-brand-charcoal/20 rounded-full text-sm font-semibold flex items-center justify-center gap-2 hover:bg-brand-pink/30"
      whileTap={{ scale: 0.98 }}
      transition={SPRING_TRANSITION}
    >
      {isSubscribed ? (
        <>
          <BellOff className="w-4 h-4" /> Alert set — tap to remove
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" /> Notify when back in stock
        </>
      )}
    </motion.button>
  );
}
