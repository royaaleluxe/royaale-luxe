"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ProductImage } from "@/components/Elements/ProductImage";
import { EmptyState } from "@/components/Elements/EmptyState";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { useUI } from "@/context/UIContext";
import { useToast } from "@/context/ToastContext";
import { FileUpload } from "@/components/Forms/FileUpload";
import { validateCartStock } from "@/lib/firestore";
import { createOrderViaApi } from "@/lib/api-client";
import { uploadReceipt } from "@/lib/storage";
import { validatePromoCode, calculateDiscount } from "@/lib/promos";
import { formatEstimatedDelivery } from "@/lib/delivery";
import {
  SAINT_LUCIA_DISTRICTS,
  BANKS,
  formatCurrency,
  generateOrderId,
  SPRING_TRANSITION,
  GLASS_CLASS,
  type District,
} from "@/lib/constants";
import type { SavedAddress } from "@/lib/types";
import { updateEmail } from "firebase/auth";
import { storefrontAuth } from "@/lib/firebase";

export default function CheckoutPage() {
  const { items, subtotal, clearCart, selectedDistrict, setSelectedDistrict } = useCart();
  const { user, profile } = useAuth();
  const { districtFees, settings, promos } = useStore();
  const { openAuthModal } = useUI();
  const { showToast } = useToast();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saveAddress, setSaveAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [form, setForm] = useState({
    firstName: profile?.firstName || "",
    lastName: profile?.lastName || "",
    email: profile?.email || "",
    phone: profile?.phoneNumber || "",
    district: (selectedDistrict || "") as District | "",
    community: "",
    directions: "",
    bankId: BANKS[0].id as string,
    couponCode: "",
  });

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        firstName: profile.firstName || f.firstName,
        lastName: profile.lastName || f.lastName,
        email: profile.email || f.email,
        phone: profile.phoneNumber || f.phone,
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (form.district) setSelectedDistrict(form.district);
  }, [form.district, setSelectedDistrict]);

  const deliveryFee = useMemo(() => {
    if (!form.district) return 0;
    const fee = districtFees.find((d) => d.district === form.district);
    return fee?.active ? fee.fee : 0;
  }, [form.district, districtFees]);

  const selectedDistrictFee = useMemo(
    () => districtFees.find((d) => d.district === form.district),
    [form.district, districtFees]
  );

  const deliveryEstimate = formatEstimatedDelivery(selectedDistrictFee);

  const activeDistricts = useMemo(
    () =>
      SAINT_LUCIA_DISTRICTS.filter((d) => {
        const fee = districtFees.find((f) => f.district === d);
        return fee ? fee.active : true;
      }),
    [districtFees]
  );

  const deliveryDayLabels = useMemo(() => {
    const days = settings?.deliveryDays?.filter((d) => d.active).map((d) => d.label);
    return days?.length ? days.join(", ") : "Mon–Sat";
  }, [settings]);

  const promoResult = useMemo(
    () => validatePromoCode(form.couponCode, subtotal, promos, settings),
    [form.couponCode, promos, settings, subtotal]
  );

  const discount = calculateDiscount(subtotal, promoResult.promo);
  const total = subtotal + deliveryFee - discount;

  const savedAddresses = profile?.savedAddresses || [];

  const applySavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setForm((f) => ({
      ...f,
      district: addr.district,
      community: addr.community,
      directions: addr.directions,
      phone: addr.phone,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal();
      return;
    }
    if (profile?.disabled) {
      showToast("Your account has been disabled. Contact support.", "error");
      return;
    }
    if (items.length === 0) {
      showToast("Your cart is empty", "error");
      return;
    }
    if (!receiptFile) {
      showToast("Please upload your bank transfer receipt", "error");
      return;
    }

    const stockErrors = await validateCartStock(items);
    if (stockErrors.length > 0) {
      const err = stockErrors[0];
      showToast(
        err.available <= 0
          ? `${err.title} is now sold out — please update your cart`
          : `Only ${err.available} left for ${err.title} — please update your cart`,
        "error"
      );
      return;
    }

    setLoading(true);
    const orderId = generateOrderId();
    try {
      let receiptUrl = "";
      try {
        receiptUrl = await uploadReceipt(orderId, receiptFile);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Receipt upload failed", "error");
        setLoading(false);
        return;
      }

      const result = await createOrderViaApi({
        orderId,
        items,
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        district: form.district,
        community: form.community,
        directions: form.directions,
        bankId: form.bankId,
        receiptUrl,
        ...(form.couponCode.trim() ? { couponCode: form.couponCode.trim() } : {}),
        saveAddress,
      });

      if (user.email !== form.email && storefrontAuth?.currentUser) {
        try {
          await updateEmail(storefrontAuth.currentUser, form.email);
        } catch {
          showToast("Profile saved — email change requires recent sign-in", "error");
        }
      }

      clearCart();
      showToast("Order placed successfully!", "success");
      router.push(`/checkout/confirmation?order=${result.firestoreOrderId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Order failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20">
        <EmptyState
          title="Your cart is empty"
          description="Discover our latest luxury pieces."
          actionLabel="Shop New Arrivals"
          actionHref="/new-arrivals"
        />
      </div>
    );
  }

  const selectedBank = BANKS.find((b) => b.id === form.bankId);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-script text-4xl text-brand-charcoal text-center mb-12"
      >
        Luxury Checkout
      </motion.h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRING_TRANSITION}
          className="space-y-6"
        >
          <section className={`${GLASS_CLASS} rounded-2xl p-6 space-y-4`}>
            <h2 className="font-semibold text-lg">Contact Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                required
                maxLength={80}
                placeholder="First Name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
              />
              <input
                required
                placeholder="Last Name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
              />
            </div>
            <input
              required
              type="email"
                maxLength={254}
                placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
            />
            <input
              required
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
            />
          </section>

          <section className={`${GLASS_CLASS} rounded-2xl p-6 space-y-4`}>
            <h2 className="font-semibold text-lg">Saint Lucia Delivery</h2>
            <p className="text-xs text-brand-muted -mt-2">We deliver on: {deliveryDayLabels}</p>

            {savedAddresses.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-brand-muted">Saved addresses</p>
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => applySavedAddress(addr)}
                    className={`w-full text-left p-3 rounded-xl border text-sm transition-colors ${
                      selectedAddressId === addr.id
                        ? "border-brand-charcoal bg-white/70"
                        : "border-white/30 hover:border-brand-pink-accent/50"
                    }`}
                  >
                    <span className="font-medium">{addr.community}</span>
                    <span className="text-brand-muted"> · {addr.district}</span>
                  </button>
                ))}
              </div>
            )}

            <select
              required
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value as District })}
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
            >
              <option value="">Select District *</option>
              {activeDistricts.map((d) => {
                const fee = districtFees.find((f) => f.district === d);
                return (
                  <option key={d} value={d}>
                    {d}
                    {fee ? ` — ${formatCurrency(fee.fee)}` : ""}
                  </option>
                );
              })}
            </select>
            {deliveryEstimate && form.district && (
              <p className="text-xs text-emerald-700 font-medium">
                Estimated delivery: {deliveryEstimate}
              </p>
            )}
            <input
              required
              placeholder="Community / Village / Estate"
              value={form.community}
              onChange={(e) => setForm({ ...form, community: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
            />
            <textarea
              required
              rows={4}
              placeholder="Detailed directions / landmarks"
              value={form.directions}
              onChange={(e) => setForm({ ...form, directions: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/60 border border-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50 resize-none"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
              />
              Save this address for future orders
            </label>
          </section>

          <section className={`${GLASS_CLASS} rounded-2xl p-6 space-y-4`}>
            <h2 className="font-semibold text-lg">Bank Transfer Payment</h2>
            <div className="space-y-2">
              {BANKS.map((bank) => (
                <label
                  key={bank.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
                    form.bankId === bank.id ? "border-black bg-white/60" : "border-white/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="bank"
                    value={bank.id}
                    checked={form.bankId === bank.id}
                    onChange={(e) => setForm({ ...form, bankId: e.target.value })}
                  />
                  <span className="text-sm font-medium">{bank.name}</span>
                </label>
              ))}
            </div>
            {selectedBank && (
              <div className="p-4 rounded-xl bg-brand-pink/30 text-sm space-y-1">
                <p><strong>Account Holder:</strong> {selectedBank.holder}</p>
                <p><strong>Account Number:</strong> {selectedBank.account}</p>
              </div>
            )}
            <FileUpload onFileSelect={setReceiptFile} />
          </section>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={SPRING_TRANSITION}
          className={`${GLASS_CLASS} rounded-2xl p-6 h-fit sticky top-28`}
        >
          <h2 className="font-semibold text-lg mb-6">Order Summary</h2>
          <div className="space-y-4 mb-6">
            {items.map((item) => (
              <div key={`${item.productId}-${item.color}-${item.size}`} className="flex gap-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <ProductImage src={item.image} alt={item.title} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-brand-muted">
                    {item.color} · {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <input
            placeholder="Coupon code"
            value={form.couponCode}
            onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-white/40 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
          />
          {form.couponCode.trim() && (
            <p className={`text-xs mb-4 ${promoResult.valid ? "text-emerald-600" : "text-red-500"}`}>
              {promoResult.message}
            </p>
          )}
          {!form.couponCode.trim() && <div className="mb-4" />}

          <div className="space-y-2 text-sm border-t border-white/20 pt-4">
            <div className="flex justify-between">
              <span className="text-brand-muted">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">
                Delivery {form.district ? `(${form.district})` : ""}
              </span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/20">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3.5 bg-black text-white font-semibold text-sm uppercase tracking-wider rounded-full disabled:opacity-50"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING_TRANSITION}
          >
            {loading ? "Processing..." : "Place Order"}
          </motion.button>
        </motion.div>
      </form>
    </div>
  );
}
