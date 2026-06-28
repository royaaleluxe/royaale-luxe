"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Product } from "@/lib/types";
import type { ProductSize } from "@/lib/constants";
import { formatCurrency, PRODUCT_SIZES, SPRING_TRANSITION, GLASS_CLASS, OVERLAY_BACKDROP } from "@/lib/constants";
import {
  getUniqueColors,
  getAvailableSizes,
  getStockForVariant,
  getImageForColor,
} from "@/lib/products";
import { ProductImage } from "./ProductImage";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { triggerHaptic } from "@/lib/haptics";
import Link from "next/link";
import { DrawerPortal } from "./DrawerPortal";

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

export function QuickViewModal({ product, onClose }: QuickViewModalProps) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState<ProductSize>("M");

  useEffect(() => {
    if (product) {
      const colors = getUniqueColors(product);
      setSelectedColor(colors[0]?.color || "");
      setSelectedSize("M");
    }
  }, [product?.id, product]);

  if (!product) return null;

  const colors = getUniqueColors(product);
  const sizes = getAvailableSizes(product, selectedColor);
  const stock = getStockForVariant(product, selectedColor, selectedSize);
  const displayImage = getImageForColor(product, selectedColor) || product.images[0];

  const handleAdd = () => {
    if (stock <= 0) {
      showToast("Sold out", "error");
      return;
    }
    const colorData = colors.find((c) => c.color === selectedColor);
    addItem({
      productId: product.id,
      title: product.title,
      image: displayImage,
      price: product.price,
      color: selectedColor,
      colorHex: colorData?.colorHex || "#000",
      size: selectedSize,
      quantity: 1,
    });
    triggerHaptic("success");
    showToast("Added to cart", "success");
    onClose();
  };

  return (
    <DrawerPortal>
      <AnimatePresence>
        <motion.div
          className={OVERLAY_BACKDROP}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className="fixed inset-0 z-[220] flex items-center justify-center p-4 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`${GLASS_CLASS} rounded-2xl max-w-lg w-full overflow-hidden pointer-events-auto`}
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-white/20">
              <h3 className="font-semibold truncate pr-4">{product.title}</h3>
              <button type="button" onClick={onClose}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 p-4">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden">
                <ProductImage src={displayImage} alt={product.title} fill className="object-cover" />
              </div>
              <div className="space-y-3">
                <p className="text-sm text-brand-muted line-clamp-3">{product.description}</p>
                <p className="font-bold text-lg">{formatCurrency(product.price)}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {colors.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => {
                        setSelectedColor(c.color);
                        const avail = getAvailableSizes(product, c.color);
                        if (avail.length && !avail.includes(selectedSize)) setSelectedSize(avail[0]);
                      }}
                      className={`w-6 h-6 rounded-full border-2 ${
                        selectedColor === c.color ? "border-brand-charcoal ring-2 ring-brand-pink-accent" : "border-gray-300"
                      }`}
                      style={{ backgroundColor: c.colorHex }}
                    />
                  ))}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {PRODUCT_SIZES.map((size) => {
                    const ok = sizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!ok}
                        onClick={() => setSelectedSize(size)}
                        className={`px-2 py-1 text-xs rounded border ${
                          selectedSize === size
                            ? "bg-brand-pink-accent border-brand-pink-accent"
                            : ok
                              ? "border-brand-pink-accent/40"
                              : "opacity-30 cursor-not-allowed"
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
                <motion.button
                  type="button"
                  onClick={handleAdd}
                  disabled={stock <= 0}
                  className="w-full py-2.5 bg-brand-charcoal text-white text-sm font-semibold rounded-full disabled:opacity-40"
                  whileTap={{ scale: 0.98 }}
                  transition={SPRING_TRANSITION}
                >
                  {stock <= 0 ? "Sold Out" : "Add to Cart"}
                </motion.button>
                <Link
                  href={`/products/${product.id}`}
                  onClick={onClose}
                  className="block text-center text-xs font-semibold text-brand-pink-accent hover:underline"
                >
                  View full details
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </DrawerPortal>
  );
}
