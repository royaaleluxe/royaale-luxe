"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Settings, RefreshCw, ChevronRight, MapPin, Trash2, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useToast } from "@/context/ToastContext";
import { fetchOrdersForUser, updateUserProfile, saveUserAddresses } from "@/lib/firestore";
import { formatCurrency, GLASS_CLASS, SPRING_TRANSITION, ORDER_STATUS_CONFIG, SAINT_LUCIA_DISTRICTS, type District } from "@/lib/constants";
import type { Order, SavedAddress } from "@/lib/types";
import { EmailVerificationBanner } from "@/components/Elements/EmailVerificationBanner";
import { updateEmail } from "firebase/auth";
import { storefrontAuth } from "@/lib/firebase";

type Tab = "profile" | "orders" | "addresses";

function AccountContent() {
  const { user, profile, loading } = useAuth();
  const { openAuthModal } = useUI();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "profile";

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [pullStart, setPullStart] = useState(0);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });
  const [addressForm, setAddressForm] = useState({
    label: "",
    district: "" as District | "",
    community: "",
    directions: "",
    phone: "",
    isDefault: false,
  });

  useEffect(() => {
    if (!loading && !user) openAuthModal();
  }, [loading, user, openAuthModal]);

  useEffect(() => {
    if (profile) {
      setForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phoneNumber: profile.phoneNumber,
      });
      setAddressForm((f) => ({
        ...f,
        phone: f.phone || profile.phoneNumber,
      }));
    }
  }, [profile]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setOrdersLoading(true);
    try {
      const data = await fetchOrdersForUser(user.uid);
      setOrders(data);
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || tab !== "orders") return;
    loadOrders();
  }, [user, tab, loadOrders]);

  const setTab = (next: Tab) => {
    router.replace(`/account?tab=${next}`);
  };

  const savedAddresses = profile?.savedAddresses || [];

  const resetAddressForm = () => {
    setAddressForm({
      label: "",
      district: "" as District | "",
      community: "",
      directions: "",
      phone: profile?.phoneNumber || "",
      isDefault: savedAddresses.length === 0,
    });
    setShowAddressForm(false);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !addressForm.district) return;
    setSavingAddress(true);
    try {
      const newAddr: SavedAddress = {
        id: `addr-${Date.now()}`,
        label: addressForm.label || addressForm.community,
        district: addressForm.district,
        community: addressForm.community,
        directions: addressForm.directions,
        phone: addressForm.phone,
        isDefault: addressForm.isDefault || savedAddresses.length === 0,
      };
      let next = [...savedAddresses, newAddr];
      if (newAddr.isDefault) {
        next = next.map((a) => ({ ...a, isDefault: a.id === newAddr.id }));
      }
      await saveUserAddresses(user.uid, next);
      showToast("Address saved", "success");
      resetAddressForm();
    } catch {
      showToast("Failed to save address", "error");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    try {
      const next = savedAddresses.filter((a) => a.id !== id);
      await saveUserAddresses(user.uid, next);
      showToast("Address removed", "success");
    } catch {
      showToast("Failed to remove address", "error");
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    if (!user) return;
    try {
      const next = savedAddresses.map((a) => ({ ...a, isDefault: a.id === id }));
      await saveUserAddresses(user.uid, next);
      showToast("Default address updated", "success");
    } catch {
      showToast("Failed to update address", "error");
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, form);
      if (user.email !== form.email && storefrontAuth?.currentUser) {
        try {
          await updateEmail(storefrontAuth.currentUser, form.email);
          showToast("Profile and email updated", "success");
        } catch {
          showToast("Profile saved — re-sign in to change email", "error");
        }
      } else {
        showToast("Profile updated", "success");
      }
    } catch {
      showToast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (tab === "orders" && window.scrollY === 0) setPullStart(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (pullStart && tab === "orders") loadOrders();
    setPullStart(0);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className={`${GLASS_CLASS} rounded-2xl p-8 animate-pulse h-64`} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-brand-muted mb-4">Please sign in to view your account.</p>
        <button type="button" onClick={openAuthModal} className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-semibold">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div
      className="max-w-3xl mx-auto px-4 md:px-6 py-8"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-charcoal mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to store
      </Link>

      <h1 className="font-display text-3xl font-bold italic mb-6">My Account</h1>

      <EmailVerificationBanner />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("profile")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            tab === "profile" ? "bg-brand-charcoal text-white" : "bg-brand-pink-accent/50 text-brand-charcoal"
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            tab === "orders" ? "bg-brand-charcoal text-white" : "bg-brand-pink-accent/50 text-brand-charcoal"
          }`}
        >
          <Package className="w-4 h-4" />
          Orders
        </button>
        <button
          type="button"
          onClick={() => setTab("addresses")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            tab === "addresses" ? "bg-brand-charcoal text-white" : "bg-brand-pink-accent/50 text-brand-charcoal"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Saved Addresses
        </button>
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className={`${GLASS_CLASS} rounded-2xl p-6 md:p-8`}
      >
        {tab === "profile" ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h2 className="font-semibold text-lg mb-4">Account Settings</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                required
              />
              <input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                required
              />
            </div>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
              required
            />
            <input
              placeholder="Phone number"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
            <motion.button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </motion.button>
          </form>
        ) : tab === "orders" ? (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Order History</h2>
              <button type="button" onClick={loadOrders} className="text-brand-muted hover:text-brand-charcoal">
                <RefreshCw className={`w-4 h-4 ${ordersLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            {ordersLoading ? (
              <p className="text-sm text-brand-muted">Loading orders...</p>
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-brand-muted text-sm mb-4">No orders yet.</p>
                <Link href="/collections" className="text-sm font-semibold text-brand-pink-accent hover:underline">
                  Start shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const config = ORDER_STATUS_CONFIG[order.status];
                  return (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.id}`}
                      className="block p-4 rounded-xl bg-white/50 border border-brand-pink-accent/20 text-sm hover:bg-white/70 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <div>
                          <p className="font-semibold">{order.orderId}</p>
                          <p className="text-xs text-brand-muted">
                            {new Date(order.createdAt).toLocaleDateString("en-LC", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-brand-muted text-xs">
                          {order.items.length} item{order.items.length > 1 ? "s" : ""} · {order.delivery.district}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatCurrency(order.total)}</span>
                          <ChevronRight className="w-4 h-4 text-brand-muted" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Saved Addresses</h2>
              {!showAddressForm && (
                <motion.button
                  type="button"
                  onClick={() => setShowAddressForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-brand-charcoal text-white text-xs font-semibold uppercase tracking-wider"
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Address
                </motion.button>
              )}
            </div>

            {savedAddresses.length === 0 && !showAddressForm ? (
              <div className="text-center py-8">
                <MapPin className="w-10 h-10 text-brand-muted mx-auto mb-3 opacity-50" />
                <p className="text-brand-muted text-sm mb-4">No saved addresses yet.</p>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(true)}
                  className="text-sm font-semibold text-brand-pink-accent hover:underline"
                >
                  Add your first address
                </button>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-xl border text-sm ${
                      addr.isDefault
                        ? "bg-white/70 border-brand-charcoal/30"
                        : "bg-white/50 border-brand-pink-accent/20"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{addr.label || addr.community}</p>
                          {addr.isDefault && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-pink-accent/60 text-brand-charcoal">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-brand-muted">{addr.community}, {addr.district}</p>
                        {addr.directions && (
                          <p className="text-brand-muted text-xs mt-1">{addr.directions}</p>
                        )}
                        <p className="text-brand-muted text-xs mt-1">{addr.phone}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-xs font-semibold text-brand-pink-accent hover:underline whitespace-nowrap"
                          >
                            Set default
                          </button>
                        )}
                        <motion.button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-200 bg-red-50/80 text-red-600 text-[11px] font-semibold uppercase tracking-wider hover:bg-red-100 transition-colors"
                          whileTap={{ scale: 0.98 }}
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove
                        </motion.button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showAddressForm && (
              <form onSubmit={handleSaveAddress} className="space-y-4 pt-4 border-t border-brand-pink-accent/20">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-brand-muted">New Address</h3>
                <input
                  placeholder="Label (e.g. Home, Work)"
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                />
                <select
                  required
                  value={addressForm.district}
                  onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value as District })}
                  className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                >
                  <option value="">Select District *</option>
                  {SAINT_LUCIA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <input
                  required
                  placeholder="Community / Area *"
                  value={addressForm.community}
                  onChange={(e) => setAddressForm({ ...addressForm, community: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                />
                <textarea
                  placeholder="Delivery directions"
                  value={addressForm.directions}
                  onChange={(e) => setAddressForm({ ...addressForm, directions: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm resize-none"
                />
                <input
                  required
                  placeholder="Phone number *"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
                />
                <label className="flex items-center gap-2 text-sm text-brand-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  Set as default address
                </label>
                <div className="flex gap-3">
                  <motion.button
                    type="submit"
                    disabled={savingAddress}
                    className="px-6 py-2.5 bg-brand-charcoal text-white rounded-full text-sm font-semibold disabled:opacity-50"
                    whileTap={{ scale: 0.98 }}
                  >
                    {savingAddress ? "Saving..." : "Save Address"}
                  </motion.button>
                  <button
                    type="button"
                    onClick={resetAddressForm}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold border border-brand-pink-accent/50 text-brand-charcoal"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16 animate-pulse h-64" />}>
      <AccountContent />
    </Suspense>
  );
}
