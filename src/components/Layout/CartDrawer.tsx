"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ProductImage } from "@/components/Elements/ProductImage";
import { EmptyState } from "@/components/Elements/EmptyState";
import Link from "next/link";
import { ShoppingBag, X, Minus, Plus, Heart, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useStore } from "@/context/StoreContext";
import { useUI } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { DrawerPortal } from "@/components/Elements/DrawerPortal";
import { formatCurrency, SPRING_TRANSITION, OVERLAY_BACKDROP, OVERLAY_PANEL } from "@/lib/constants";
import { formatEstimatedDelivery, getDefaultDeliveryEstimate } from "@/lib/delivery";
import { getDistrictFee } from "@/lib/delivery";
import type { District } from "@/lib/constants";
import { triggerHaptic } from "@/lib/haptics";

export function CartDrawer() {
  const { items, subtotal, itemCount, removeItem, updateQuantity, moveToWishlist, selectedDistrict, setSelectedDistrict } = useCart();
  const { districtFees } = useStore();
  const { cartOpen, setCartOpen, openAuthModal } = useUI();
  const { user } = useAuth();
  const { showToast } = useToast();

  const districtFee = getDistrictFee(districtFees, selectedDistrict as District);
  const deliveryEstimate = districtFee
    ? formatEstimatedDelivery(districtFee)
    : getDefaultDeliveryEstimate();
  const deliveryCost = districtFee?.active ? districtFee.fee : subtotal > 0 ? districtFees[0]?.fee ?? 15 : 0;

  const handleMoveToWishlist = async (item: (typeof items)[0]) => {
    if (!user) {
      openAuthModal();
      return;
    }
    try {
      await moveToWishlist(item);
      triggerHaptic("light");
      showToast("Moved to wishlist", "success");
    } catch {
      showToast("Failed to move to wishlist", "error");
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setCartOpen(true)}
        className="relative p-2 rounded-full hover:bg-brand-pink/60 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Shopping cart"
      >
        <ShoppingBag className="w-5 h-5 text-brand-charcoal" />
        {itemCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-brand-pink-accent text-brand-charcoal text-[10px] font-bold rounded-full">
            {itemCount}
          </span>
        )}
      </motion.button>

      <DrawerPortal>
        <AnimatePresence>
          {cartOpen && (
            <>
              <motion.div
                className={OVERLAY_BACKDROP}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCartOpen(false)}
              />
              <motion.aside
                className={`${OVERLAY_PANEL} right-0 w-96 max-w-[90vw] border-l flex flex-col`}
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="flex justify-between items-center p-6 border-b border-brand-pink-accent/30">
                  <h2 className="font-sans font-semibold text-lg text-brand-charcoal">Your Cart</h2>
                  <button type="button" onClick={() => setCartOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {items.length === 0 ? (
                    <EmptyState
                      title="Your cart is empty"
                      actionLabel="Shop New Arrivals"
                      actionHref="/new-arrivals"
                    />
                  ) : (
                    items.map((item) => (
                      <motion.div
                        key={`${item.productId}-${item.color}-${item.size}`}
                        className="flex gap-3 p-3 rounded-xl bg-white/50 border border-brand-pink-accent/20"
                        layout
                      >
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <ProductImage src={item.image} alt={item.title} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-brand-muted">{item.color} · {item.size}</p>
                          <p className="text-sm font-semibold mt-1">{formatCurrency(item.price)}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                updateQuantity(item.productId, item.color, item.size, item.quantity - 1);
                                triggerHaptic("light");
                              }}
                              className="p-1 rounded bg-brand-pink/60"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm w-6 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                updateQuantity(item.productId, item.color, item.size, item.quantity + 1);
                                triggerHaptic("light");
                              }}
                              className="p-1 rounded bg-brand-pink/60"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <motion.button
                              type="button"
                              onClick={() => handleMoveToWishlist(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-pink-accent/60 bg-white/70 text-brand-charcoal text-[11px] font-semibold uppercase tracking-wider hover:bg-brand-pink/40 transition-colors"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              transition={SPRING_TRANSITION}
                            >
                              <Heart className="w-3 h-3" />
                              Wishlist
                            </motion.button>
                            <motion.button
                              type="button"
                              onClick={() => removeItem(item.productId, item.color, item.size)}
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

                {items.length > 0 && (
                  <div className="p-6 border-t border-brand-pink-accent/30 space-y-3">
                    <div>
                      <label className="text-xs text-brand-muted block mb-1">Delivery district (estimate)</label>
                      <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white/60 border border-white/40 text-sm"
                      >
                        <option value="">Select district</option>
                        {districtFees.filter((f) => f.active).map((f) => (
                          <option key={f.district} value={f.district}>
                            {f.district} — {formatCurrency(f.fee)}
                          </option>
                        ))}
                      </select>
                      {deliveryEstimate && (
                        <p className="text-[10px] text-brand-muted mt-1">Est. delivery: {deliveryEstimate}</p>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-muted">Subtotal</span>
                      <span className="font-semibold">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-muted">Delivery (est.)</span>
                      <span className="font-semibold">{formatCurrency(deliveryCost)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t border-brand-pink-accent/20">
                      <span>Total</span>
                      <span>{formatCurrency(subtotal + deliveryCost)}</span>
                    </div>
                    <Link href="/checkout" onClick={() => setCartOpen(false)}>
                      <motion.span
                        className="block w-full text-center py-3.5 bg-brand-charcoal text-white font-sans font-semibold text-sm uppercase tracking-wider rounded-full"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        transition={SPRING_TRANSITION}
                      >
                        Proceed to Luxury Checkout
                      </motion.span>
                    </Link>
                  </div>
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </DrawerPortal>
    </>
  );
}
