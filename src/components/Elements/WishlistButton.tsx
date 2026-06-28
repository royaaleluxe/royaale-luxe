"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ProductImage } from "@/components/Elements/ProductImage";
import { Heart, X, Trash2, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";
import { useToast } from "@/context/ToastContext";
import { DrawerPortal } from "@/components/Elements/DrawerPortal";
import { toggleWishlistItem } from "@/lib/wishlist";
import { formatCurrency, SPRING_TRANSITION, OVERLAY_BACKDROP, OVERLAY_PANEL } from "@/lib/constants";
import type { ProductSize } from "@/lib/constants";

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1595777457583-95e0599d2c4f?w=200&q=60";

export function WishlistButton() {
  const { user, profile } = useAuth();
  const { wishlistOpen, setWishlistOpen, openAuthModal } = useUI();
  const { products } = useStore();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const productIdSet = new Set(products.map((p) => p.id));
  const wishlistIds = (profile?.savedWishlist || []).filter((id) => productIdSet.has(id));
  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));
  const orphanCount = (profile?.savedWishlist?.length || 0) - wishlistIds.length;

  const handleRemove = async (productId: string) => {
    if (!user) return;
    try {
      await toggleWishlistItem(user.uid, profile?.savedWishlist || [], productId);
      showToast("Removed from wishlist", "success");
    } catch {
      showToast("Failed to update wishlist", "error");
    }
  };

  const handleMoveToCart = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const variant = product.variants.find((v) => v.quantity > 0);
    if (!variant) {
      showToast("Product is out of stock", "error");
      return;
    }
    addItem({
      productId: product.id,
      title: product.title,
      image: product.images[0] || PLACEHOLDER_IMAGE,
      price: product.price,
      color: variant.color,
      colorHex: variant.colorHex,
      size: variant.size as ProductSize,
      quantity: 1,
    });
    showToast("Moved to cart", "success");
  };

  return (
    <>
      <motion.button
        onClick={() => {
          if (!user) openAuthModal();
          else setWishlistOpen(true);
        }}
        className="relative p-2 rounded-full hover:bg-brand-pink/60 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Wishlist"
      >
        <Heart className="w-5 h-5 text-brand-charcoal" />
        {wishlistIds.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
            {wishlistIds.length}
          </span>
        )}
      </motion.button>

      <DrawerPortal>
        <AnimatePresence>
          {wishlistOpen && (
            <>
              <motion.div
                className={OVERLAY_BACKDROP}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setWishlistOpen(false)}
              />
              <motion.aside
                className={`${OVERLAY_PANEL} right-0 w-96 max-w-[90vw] border-l flex flex-col`}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="flex justify-between items-center p-6 border-b border-brand-pink-accent/30">
                  <h2 className="font-sans font-semibold text-lg text-brand-charcoal">Wishlist</h2>
                  <button onClick={() => setWishlistOpen(false)} aria-label="Close wishlist">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {orphanCount > 0 && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                      {orphanCount} saved item{orphanCount > 1 ? "s" : ""} no longer available.
                    </p>
                  )}
                  {wishlistProducts.length === 0 ? (
                    <p className="text-sm text-brand-muted text-center py-8">Your wishlist is empty</p>
                  ) : (
                    wishlistProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        className="flex gap-3 p-3 rounded-xl bg-white/50 border border-brand-pink-accent/20"
                        layout
                      >
                        <Link
                          href={`/products/${product.id}`}
                          onClick={() => setWishlistOpen(false)}
                          className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0"
                        >
                          <ProductImage
                            src={product.images[0] || PLACEHOLDER_IMAGE}
                            alt={product.title}
                            fill
                            className="object-cover"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${product.id}`}
                            onClick={() => setWishlistOpen(false)}
                            className="text-sm font-medium truncate block hover:text-brand-pink-accent"
                          >
                            {product.title}
                          </Link>
                          <p className="text-sm font-semibold">{formatCurrency(product.price)}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <motion.button
                              onClick={() => handleMoveToCart(product.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-charcoal text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-brand-charcoal/90 transition-colors"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              transition={SPRING_TRANSITION}
                            >
                              <ShoppingBag className="w-3 h-3" />
                              Add to Cart
                            </motion.button>
                            <motion.button
                              onClick={() => handleRemove(product.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50/80 text-red-600 text-[11px] font-semibold uppercase tracking-wider hover:bg-red-100 transition-colors"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              transition={SPRING_TRANSITION}
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </DrawerPortal>
    </>
  );
}
