"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Search,
  Shield,
  ShieldOff,
  UserX,
  UserCheck,
  KeyRound,
  ChevronRight,
  X,
  Package,
  Heart,
} from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { adminAuth, adminDb } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeUsers,
  subscribeAdmins,
  grantAdminAccess,
  revokeAdminAccess,
  setUserDisabled,
  updateUserProfile,
  fetchOrdersForUser,
  fetchProductsByIds,
} from "@/lib/firestore";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, GLASS_CLASS, ORDER_STATUS_CONFIG, SPRING_TRANSITION } from "@/lib/constants";
import type { AdminUser, Order, Product, UserProfile } from "@/lib/types";

type DetailPanel = "orders" | "wishlist" | null;

export function AdminUsers() {
  const { user: currentUser, isAdmin, loading } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [togglingDisabled, setTogglingDisabled] = useState(false);
  const [detailPanel, setDetailPanel] = useState<DetailPanel>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (loading || !currentUser || !isAdmin || !adminDb) return;

    const unsubUsers = subscribeUsers(setUsers, adminDb);
    const unsubAdmins = subscribeAdmins(setAdmins, adminDb);
    return () => {
      unsubUsers();
      unsubAdmins();
    };
  }, [loading, currentUser, isAdmin]);

  const selectedUid = selected?.uid;

  useEffect(() => {
    if (!selectedUid) return;
    const updated = users.find((u) => u.uid === selectedUid);
    if (updated) setSelected(updated);
  }, [users, selectedUid]);

  const adminUids = useMemo(() => new Set(admins.map((a) => a.uid)), [admins]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.firstName ?? "").toLowerCase().includes(q) ||
        (u.lastName ?? "").toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleToggleAdmin = async (profile: UserProfile) => {
    if (profile.uid === currentUser?.uid) {
      showToast("You cannot remove your own admin access", "error");
      return;
    }
    try {
      if (adminUids.has(profile.uid)) {
        await revokeAdminAccess(profile.uid, adminDb);
        showToast("Admin access revoked", "success");
      } else {
        await grantAdminAccess(profile.uid, profile.email, adminDb);
        showToast("Admin access granted", "success");
      }
    } catch {
      showToast("Failed to update admin access", "error");
    }
  };

  const handleToggleDisabled = async (profile: UserProfile) => {
    if (profile.uid === currentUser?.uid) {
      showToast("You cannot disable your own account", "error");
      return;
    }
    const nextDisabled = !profile.disabled;
    const action = nextDisabled ? "disable" : "enable";
    if (!window.confirm(`${action === "disable" ? "Disable" : "Enable"} ${profile.firstName} ${profile.lastName}?`)) {
      return;
    }
    setTogglingDisabled(true);
    try {
      const idToken = await adminAuth?.currentUser?.getIdToken();
      await setUserDisabled(profile.uid, nextDisabled, adminDb, idToken);
      showToast(nextDisabled ? "User disabled" : "User enabled", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user status";
      showToast(message, "error");
    } finally {
      setTogglingDisabled(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await updateUserProfile(selected.uid, { adminNotes: notes }, adminDb);
      showToast("Notes saved", "success");
      setSelected({ ...selected, adminNotes: notes });
    } catch {
      showToast("Failed to save notes", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (profile: UserProfile) => {
    if (!adminAuth) {
      showToast("Authentication unavailable", "error");
      return;
    }
    if (!window.confirm(`Send a password reset email to ${profile.email}?`)) return;
    setResettingPassword(true);
    try {
      await sendPasswordResetEmail(adminAuth, profile.email);
      showToast(`Password reset email sent to ${profile.email}`, "success");
    } catch {
      showToast("Failed to send password reset email", "error");
    } finally {
      setResettingPassword(false);
    }
  };

  const openUser = (profile: UserProfile) => {
    setSelected(profile);
    setNotes(profile.adminNotes || "");
    setDetailPanel(null);
    setUserOrders([]);
    setWishlistProducts([]);
    setSelectedOrder(null);
  };

  const openDetailPanel = async (panel: DetailPanel) => {
    if (!selected || !adminDb) return;
    if (detailPanel === panel) {
      setDetailPanel(null);
      setSelectedOrder(null);
      return;
    }

    setDetailPanel(panel);
    setSelectedOrder(null);
    setLoadingDetails(true);
    try {
      if (panel === "orders") {
        const orders = await fetchOrdersForUser(selected.uid, adminDb);
        setUserOrders(orders);
      } else if (panel === "wishlist") {
        const products = await fetchProductsByIds(selected.savedWishlist || [], adminDb);
        setWishlistProducts(products);
      }
    } catch {
      showToast(`Failed to load ${panel}`, "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">User Management</h2>
      <p className="text-sm text-brand-muted mb-6">
        {users.length} registered users · {admins.length} admins
      </p>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
        <input
          placeholder="Search by name, email, or UID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink-accent/50"
        />
      </div>

      <div className={`${GLASS_CLASS} rounded-2xl overflow-hidden`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20 text-left bg-white/20">
              <th className="p-4">User</th>
              <th className="p-4 hidden md:table-cell">Phone</th>
              <th className="p-4 hidden sm:table-cell">Orders</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((profile) => {
              const isUserAdmin = adminUids.has(profile.uid);
              return (
                <tr
                  key={profile.uid}
                  className="border-b border-white/10 hover:bg-white/30 cursor-pointer"
                  onClick={() => openUser(profile)}
                >
                  <td className="p-4">
                    <p className="font-medium">
                      {profile.firstName} {profile.lastName}
                    </p>
                    <p className="text-xs text-brand-muted">{profile.email}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell text-brand-muted">
                    {profile.phoneNumber || "—"}
                  </td>
                  <td className="p-4 hidden sm:table-cell">{profile.orderHistory?.length || 0}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        isUserAdmin ? "bg-brand-charcoal text-white" : "bg-brand-pink/50"
                      }`}
                    >
                      {isUserAdmin ? "Admin" : "Customer"}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        profile.disabled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {profile.disabled ? "Disabled" : "Active"}
                    </span>
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleAdmin(profile)}
                        title={isUserAdmin ? "Revoke admin" : "Grant admin"}
                        className="p-2 rounded-lg hover:bg-white/60 transition-colors"
                      >
                        {isUserAdmin ? (
                          <ShieldOff className="w-4 h-4 text-brand-muted" />
                        ) : (
                          <Shield className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleToggleDisabled(profile)}
                        disabled={togglingDisabled}
                        title={profile.disabled ? "Enable user" : "Disable user"}
                        className="p-2 rounded-lg hover:bg-white/60 transition-colors disabled:opacity-50"
                      >
                        {profile.disabled ? (
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <UserX className="w-4 h-4 text-red-500" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-brand-muted">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_TRANSITION}
          className={`${GLASS_CLASS} rounded-2xl p-6 mt-6 space-y-4`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold">
                {selected.firstName} {selected.lastName}
              </h3>
              <p className="text-sm text-brand-muted">{selected.email}</p>
              <p className="text-xs text-brand-muted font-mono mt-1">{selected.uid}</p>
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setDetailPanel(null);
                setSelectedOrder(null);
              }}
              className="text-sm text-brand-muted hover:text-brand-charcoal"
            >
              Close
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-xl bg-white/40">
              <p className="text-brand-muted text-xs">Phone</p>
              <p className="font-medium">{selected.phoneNumber || "—"}</p>
            </div>
            <button
              type="button"
              onClick={() => openDetailPanel("orders")}
              className={`p-3 rounded-xl text-left transition-colors ${
                detailPanel === "orders" ? "bg-brand-charcoal text-white" : "bg-white/40 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-xs ${detailPanel === "orders" ? "text-white/70" : "text-brand-muted"}`}>
                  Orders
                </p>
                <Package className="w-4 h-4 opacity-60" />
              </div>
              <p className="font-medium flex items-center gap-1">
                {selected.orderHistory?.length || 0}
                <ChevronRight className="w-3 h-3 opacity-60" />
              </p>
            </button>
            <button
              type="button"
              onClick={() => openDetailPanel("wishlist")}
              className={`p-3 rounded-xl text-left transition-colors ${
                detailPanel === "wishlist" ? "bg-brand-charcoal text-white" : "bg-white/40 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-xs ${detailPanel === "wishlist" ? "text-white/70" : "text-brand-muted"}`}>
                  Wishlist items
                </p>
                <Heart className="w-4 h-4 opacity-60" />
              </div>
              <p className="font-medium flex items-center gap-1">
                {selected.savedWishlist?.length || 0}
                <ChevronRight className="w-3 h-3 opacity-60" />
              </p>
            </button>
          </div>

          {detailPanel && (
            <div className={`${GLASS_CLASS} rounded-xl p-4`}>
              {loadingDetails ? (
                <p className="text-sm text-brand-muted text-center py-6">Loading...</p>
              ) : detailPanel === "orders" ? (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm mb-3">Order History</h4>
                  {userOrders.length === 0 ? (
                    <p className="text-sm text-brand-muted text-center py-4">No orders yet</p>
                  ) : (
                    userOrders.map((order) => {
                      const statusConfig = ORDER_STATUS_CONFIG[order.status];
                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="w-full flex items-center justify-between p-3 rounded-lg bg-white/40 hover:bg-white/60 transition-colors text-left"
                        >
                          <div>
                            <p className="font-mono font-medium text-sm">{order.orderId}</p>
                            <p className="text-xs text-brand-muted">
                              {new Date(order.createdAt).toLocaleDateString("en-LC", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}
                            >
                              {statusConfig.shortLabel}
                            </span>
                            <span className="font-semibold text-sm">{formatCurrency(order.total)}</span>
                            <ChevronRight className="w-4 h-4 text-brand-muted" />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm mb-3">Wishlist</h4>
                  {wishlistProducts.length === 0 ? (
                    <p className="text-sm text-brand-muted text-center py-4">
                      {(selected.savedWishlist?.length || 0) > 0
                        ? "Wishlist items could not be loaded (products may have been removed)"
                        : "Wishlist is empty"}
                    </p>
                  ) : (
                    wishlistProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex gap-4 p-3 rounded-lg bg-white/40"
                      >
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-white/60">
                          {product.images[0] ? (
                            <Image
                              src={product.images[0]}
                              alt={product.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-muted text-xs">
                              No img
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.title}</p>
                          <p className="text-xs text-brand-muted">{product.category}</p>
                          <p className="text-sm font-semibold mt-1">{formatCurrency(product.price)}</p>
                          {product.variants.length > 0 && (
                            <p className="text-xs text-brand-muted mt-1">
                              {product.variants.length} variant{product.variants.length !== 1 ? "s" : ""} ·{" "}
                              {product.variants.reduce((sum, v) => sum + v.quantity, 0)} in stock
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {(selected.savedWishlist?.length || 0) > wishlistProducts.length && wishlistProducts.length > 0 && (
                    <p className="text-xs text-brand-muted text-center">
                      {selected.savedWishlist!.length - wishlistProducts.length} saved item(s) reference removed products
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <motion.button
              onClick={() => handleResetPassword(selected)}
              disabled={resettingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/60 border border-white/40 rounded-full text-sm font-semibold hover:bg-white/80 transition-colors disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <KeyRound className="w-4 h-4" />
              {resettingPassword ? "Sending..." : "Send Password Reset"}
            </motion.button>
          </div>

          <div>
            <label className="text-sm font-semibold block mb-2">Admin notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this customer..."
              className="w-full px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm resize-none"
            />
            <motion.button
              onClick={handleSaveNotes}
              disabled={saving}
              className="mt-3 px-6 py-2 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? "Saving..." : "Save Notes"}
            </motion.button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
            />
            <motion.aside
              className="fixed top-0 right-0 h-full w-full max-w-lg z-50 bg-white/95 backdrop-blur-xl border-l shadow-glass overflow-y-auto"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold">Order #{selectedOrder.orderId}</h3>
                    <p className="text-sm text-brand-muted mt-1">
                      {new Date(selectedOrder.createdAt).toLocaleDateString("en-LC", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <span
                    className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${ORDER_STATUS_CONFIG[selectedOrder.status].bg} ${ORDER_STATUS_CONFIG[selectedOrder.status].text}`}
                  >
                    {ORDER_STATUS_CONFIG[selectedOrder.status].label}
                  </span>
                </div>

                <div className="space-y-4 text-sm">
                  <div className={`${GLASS_CLASS} rounded-xl p-4`}>
                    <h4 className="font-semibold mb-2">Customer</h4>
                    <p>{selectedOrder.userName}</p>
                    <p className="text-brand-muted">{selectedOrder.userEmail}</p>
                    <p className="text-brand-muted">{selectedOrder.delivery.phone}</p>
                  </div>

                  <div className={`${GLASS_CLASS} rounded-xl p-4`}>
                    <h4 className="font-semibold mb-2">Delivery</h4>
                    <p>
                      <strong>District:</strong> {selectedOrder.delivery.district}
                    </p>
                    <p>
                      <strong>Community:</strong> {selectedOrder.delivery.community}
                    </p>
                    <p className="mt-2 text-brand-muted">{selectedOrder.delivery.directions}</p>
                  </div>

                  <div className={`${GLASS_CLASS} rounded-xl p-4`}>
                    <h4 className="font-semibold mb-2">Items</h4>
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-white/10 last:border-0">
                        <span>
                          {item.title} ({item.size}/{item.color}) ×{item.quantity}
                        </span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/20 mt-3 pt-3 space-y-1">
                      <div className="flex justify-between text-brand-muted">
                        <span>Subtotal</span>
                        <span>{formatCurrency(selectedOrder.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-brand-muted">
                        <span>Delivery</span>
                        <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                      </div>
                      {selectedOrder.discount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount{selectedOrder.couponCode ? ` (${selectedOrder.couponCode})` : ""}</span>
                          <span>-{formatCurrency(selectedOrder.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base pt-1">
                        <span>Total</span>
                        <span>{formatCurrency(selectedOrder.total)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.bankId && (
                    <div className={`${GLASS_CLASS} rounded-xl p-4`}>
                      <h4 className="font-semibold mb-2">Payment</h4>
                      <p className="text-brand-muted">Bank reference: {selectedOrder.bankId}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
