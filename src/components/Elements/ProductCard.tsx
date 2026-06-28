"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ProductImage } from "@/components/Elements/ProductImage";
import Link from "next/link";
import { Heart, Eye, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/types";
import type { ProductSize } from "@/lib/constants";
import { formatCurrency, PRODUCT_SIZES, SPRING_TRANSITION, GLASS_CLASS } from "@/lib/constants";
import {
  getUniqueColors,
  getAvailableSizes,
  getInventoryStatus,
  getStockForVariant,
  getImageForColor,
  getCardStockBadge,
} from "@/lib/products";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";
import { useToast } from "@/context/ToastContext";
import { toggleWishlistItem } from "@/lib/wishlist";
import { triggerHaptic } from "@/lib/haptics";

interface ProductCardProps {
  product: Product;
  index?: number;
  onQuickView?: () => void;
}

export function ProductCard({ product, index = 0, onQuickView }: ProductCardProps) {
  const colors = getUniqueColors(product);
  const [selectedColor, setSelectedColor] = useState(colors[0]?.color || "");
  const [selectedSize, setSelectedSize] = useState<ProductSize>("M");
  const [imageIndex, setImageIndex] = useState(0);
  const { user, profile } = useAuth();
  const { addItem } = useCart();
  const { openAuthModal } = useUI();
  const { showToast } = useToast();

  const allImages = [...product.images, ...(product.altImages || [])];
  const colorImage = getImageForColor(product, selectedColor);
  const displayImage =
    imageIndex > 0
      ? allImages[imageIndex] || product.images[0]
      : colorImage || allImages[0] || product.images[0];
  const sizes = getAvailableSizes(product, selectedColor);
  const status = getInventoryStatus(product, selectedColor, selectedSize);
  const stock = getStockForVariant(product, selectedColor, selectedSize);
  const badge = getCardStockBadge(product);
  const isWishlisted = profile?.savedWishlist?.includes(product.id) ?? false;

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    setImageIndex(0);
    const available = getAvailableSizes(product, color);
    if (available.length > 0 && !available.includes(selectedSize)) {
      setSelectedSize(available[0]);
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    try {
      await toggleWishlistItem(user.uid, profile?.savedWishlist || [], product.id);
      triggerHaptic("light");
      showToast(isWishlisted ? "Removed from wishlist" : "Added to wishlist", "success");
    } catch {
      showToast("Failed to update wishlist", "error");
    }
  };

  const handleAddToCart = () => {
    if (stock <= 0) {
      showToast("This variant is sold out", "error");
      return;
    }
    const colorData = colors.find((c) => c.color === selectedColor);
    addItem({
      productId: product.id,
      title: product.title,
      image: getImageForColor(product, selectedColor) || product.images[0],
      price: product.price,
      color: selectedColor,
      colorHex: colorData?.colorHex || "#000",
      size: selectedSize,
      quantity: 1,
    });
    triggerHaptic("success");
    showToast("Added to cart", "success");
  };

  const statusColors = {
    success: "text-emerald-600",
    warning: "text-amber-500",
    muted: "text-brand-muted",
  };

  return (
    <motion.article
      className={`${GLASS_CLASS} rounded-2xl overflow-hidden group`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING_TRANSITION, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
    >
      <div
        className="relative aspect-[3/4] overflow-hidden"
        onMouseEnter={() => !colorImage && allImages.length > 1 && setImageIndex(1)}
        onMouseLeave={() => setImageIndex(0)}
      >
        <Link href={`/products/${product.id}`} className="block relative w-full h-full">
          <motion.div className="relative w-full h-full" whileHover={{ scale: 1.06 }} transition={SPRING_TRANSITION}>
            <ProductImage
              src={displayImage}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </motion.div>
        </Link>

        {badge && (
          <span className={`absolute top-3 left-3 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${badge.className}`}>
            {badge.label}
          </span>
        )}

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <motion.button
            onClick={handleWishlist}
            className="p-2 rounded-full bg-brand-pink/80 backdrop-blur-sm"
            whileTap={{ scale: 0.8 }}
          >
            <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : "text-brand-charcoal"}`} />
          </motion.button>
          {onQuickView && (
            <button
              type="button"
              onClick={onQuickView}
              className="p-2 rounded-full bg-brand-pink/80 backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              aria-label="Quick view"
            >
              <Eye className="w-5 h-5 text-brand-charcoal" />
            </button>
          )}
        </div>

        <motion.button
          onClick={handleAddToCart}
          className="absolute bottom-0 left-0 right-0 py-3 bg-brand-charcoal/90 text-white text-sm font-semibold uppercase tracking-wider translate-y-full md:group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-2"
          whileTap={{ scale: 0.98 }}
        >
          <ShoppingBag className="w-4 h-4" />
          Add to Cart
        </motion.button>
        <button
          onClick={handleAddToCart}
          className="md:hidden absolute bottom-0 left-0 right-0 py-3 bg-brand-charcoal/90 text-white text-sm font-semibold uppercase tracking-wider flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          Add to Cart
        </button>
      </div>

      <div className="p-4 space-y-3">
        <Link href={`/products/${product.id}`}>
          <h3 className="font-sans font-semibold text-brand-charcoal hover:text-brand-pink-accent transition-colors">
            {product.title}
          </h3>
        </Link>
        <p className="text-[10px] uppercase tracking-wider text-brand-muted">{product.category}</p>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-brand-muted mb-1.5">{selectedColor}</p>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c.color}
                onClick={() => handleColorChange(c.color)}
                className={`w-6 h-6 rounded-full border-2 shadow-sm transition-transform ${
                  selectedColor === c.color
                    ? "border-brand-charcoal ring-2 ring-brand-pink-accent scale-110"
                    : "border-gray-300 hover:scale-105"
                }`}
                style={{ backgroundColor: c.colorHex }}
                title={c.color}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {PRODUCT_SIZES.map((size) => {
            const available = sizes.includes(size);
            return (
              <button
                key={size}
                disabled={!available}
                onClick={() => setSelectedSize(size)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                  selectedSize === size
                    ? "bg-brand-pink-accent text-brand-charcoal border-brand-pink-accent"
                    : available
                      ? "border-brand-pink-accent/40 text-brand-charcoal hover:border-brand-pink-accent"
                      : "border-brand-muted/20 text-brand-muted/40 cursor-not-allowed"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-brand-charcoal">{formatCurrency(product.price)}</span>
          {product.originalPrice && (
            <span className="text-sm text-brand-muted line-through">{formatCurrency(product.originalPrice)}</span>
          )}
        </div>
        <span className={`text-xs font-semibold uppercase tracking-wider ${statusColors[status.tone]}`}>
          {status.label}
        </span>
      </div>
    </motion.article>
  );
}
