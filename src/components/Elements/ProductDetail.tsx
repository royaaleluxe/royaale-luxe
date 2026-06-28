"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/types";
import type { ProductSize } from "@/lib/constants";
import { formatCurrency, PRODUCT_SIZES, SPRING_TRANSITION, GLASS_CLASS } from "@/lib/constants";
import {
  getUniqueColors,
  getAvailableSizes,
  getInventoryStatus,
  getStockForVariant,
  getImageForColor,
  getRelatedProducts,
} from "@/lib/products";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useStore } from "@/context/StoreContext";
import { useUI } from "@/context/UIContext";
import { useToast } from "@/context/ToastContext";
import { toggleWishlistItem } from "@/lib/wishlist";
import { triggerHaptic } from "@/lib/haptics";
import { ImageZoomGallery } from "./ImageZoomGallery";
import { ShareProductIconButton } from "./ShareProductButton";
import { BackInStockButton } from "./BackInStockButton";
import { ProductCard } from "./ProductCard";

export function ProductDetail({ product }: { product: Product }) {
  const colors = getUniqueColors(product);
  const [selectedColor, setSelectedColor] = useState(colors[0]?.color || "");
  const [selectedSize, setSelectedSize] = useState<ProductSize>("M");
  const [imageIndex, setImageIndex] = useState(0);
  const { user, profile } = useAuth();
  const { products } = useStore();
  const { addItem } = useCart();
  const { openAuthModal } = useUI();
  const { showToast } = useToast();

  const allImages = [...product.images, ...(product.altImages || [])];
  const colorImage = getImageForColor(product, selectedColor);
  const galleryImages = colorImage
    ? [colorImage, ...allImages.filter((img) => img !== colorImage)]
    : allImages;
  const sizes = getAvailableSizes(product, selectedColor);
  const status = getInventoryStatus(product, selectedColor, selectedSize);
  const stock = getStockForVariant(product, selectedColor, selectedSize);
  const isWishlisted = profile?.savedWishlist?.includes(product.id) ?? false;
  const related = getRelatedProducts(product, products);

  useEffect(() => {
    if (colorImage) {
      const imgs = colorImage
        ? [colorImage, ...allImages.filter((img) => img !== colorImage)]
        : allImages;
      const idx = imgs.indexOf(colorImage);
      if (idx >= 0) setImageIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, colorImage]);

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
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
    <>
      <div className={`${GLASS_CLASS} rounded-3xl overflow-hidden grid md:grid-cols-2 gap-0`}>
        <ImageZoomGallery
          images={galleryImages.length ? galleryImages : [product.images[0]]}
          alt={product.title}
          activeIndex={imageIndex}
          onIndexChange={setImageIndex}
          imageAlts={product.imageAlts}
        />

        <div className="p-8 md:p-12 flex flex-col justify-center space-y-6 pb-24 md:pb-12">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="text-xs uppercase tracking-luxe text-brand-muted mb-2">{product.category}</p>
              <h1 className="font-display text-3xl md:text-4xl font-bold italic">{product.title}</h1>
            </div>
            <div className="flex gap-2">
              <ShareProductIconButton productId={product.id} title={product.title} />
              <motion.button
                onClick={handleWishlist}
                className="p-2.5 rounded-full bg-brand-pink/80 hover:bg-brand-pink-accent/60"
                whileTap={{ scale: 0.9 }}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? "fill-red-500 text-red-500" : "text-brand-charcoal"}`} />
              </motion.button>
            </div>
          </div>

          <p className="text-brand-muted leading-relaxed">{product.description}</p>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold">{formatCurrency(product.price)}</span>
            {product.originalPrice && (
              <span className="text-lg text-brand-muted line-through">{formatCurrency(product.originalPrice)}</span>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">
              Color — <span className="text-brand-charcoal">{selectedColor}</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c.color}
                  onClick={() => handleColorChange(c.color)}
                  className={`w-8 h-8 rounded-full border-2 shadow-sm transition-transform ${
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

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted mb-2">Size</p>
            <div className="flex gap-2 flex-wrap">
              {PRODUCT_SIZES.map((size) => {
                const available = sizes.includes(size);
                return (
                  <button
                    key={size}
                    disabled={!available}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
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
          </div>

          <span className={`text-sm font-semibold uppercase tracking-wider ${statusColors[status.tone]}`}>
            {status.label}
          </span>

          <motion.button
            onClick={handleAddToCart}
            disabled={stock <= 0}
            className="hidden md:block w-full py-4 bg-brand-charcoal text-white font-semibold text-sm uppercase tracking-wider rounded-full disabled:opacity-40"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING_TRANSITION}
          >
            {stock <= 0 ? "Sold Out" : "Add to Cart"}
          </motion.button>

          <BackInStockButton product={product} color={selectedColor} size={selectedSize} />
        </div>
      </div>

      {/* Mobile sticky add to cart */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-brand-pink/95 backdrop-blur-xl border-t border-brand-pink-accent/40">
        <motion.button
          onClick={handleAddToCart}
          disabled={stock <= 0}
          className="w-full py-3.5 bg-brand-charcoal text-white font-semibold text-sm uppercase tracking-wider rounded-full disabled:opacity-40"
          whileTap={{ scale: 0.98 }}
        >
          {stock <= 0 ? "Sold Out" : `Add to Cart — ${formatCurrency(product.price)}`}
        </motion.button>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="font-script text-3xl text-brand-charcoal text-center mb-8">You May Also Love</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
