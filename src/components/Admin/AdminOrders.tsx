"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  X,
  Check,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { isDataUrl } from "@/lib/storage";
import { subscribeOrders, updateOrderStatus, bulkUpdateOrderStatus, updateOrderInternalNotes } from "@/lib/firestore";
import { useToast } from "@/context/ToastContext";
import {
  formatCurrency,
  GLASS_CLASS,
  ORDER_STATUSES,
  ORDER_STATUS_CONFIG,
  ORDER_STATUS_FLOW,
  SPRING_TRANSITION,
  type OrderStatus,
} from "@/lib/constants";
import type { Order } from "@/lib/types";

const STATUS_ICONS = {
  "Pending Verification": Clock,
  Processing: Package,
  "Out for Delivery": Truck,
  Completed: CheckCircle2,
  Cancelled: XCircle,
} as const;

function StatusBadge({ status, size = "sm" }: { status: OrderStatus; size?: "sm" | "md" }) {
  const config = ORDER_STATUS_CONFIG[status];
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.bg} ${config.text} ${
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      }`}
    >
      <Icon className={size === "md" ? "w-4 h-4" : "w-3 h-3"} />
      {size === "md" ? config.label : config.shortLabel}
    </span>
  );
}

function OrderStatusStepper({
  currentStatus,
  onStatusChange,
  updating,
}: {
  currentStatus: OrderStatus;
  onStatusChange: (status: OrderStatus) => void;
  updating: boolean;
}) {
  const isCancelled = currentStatus === "Cancelled";
  const currentStep = ORDER_STATUS_CONFIG[currentStatus].step;

  return (
    <div className="space-y-4">
      {!isCancelled && (
        <div className="relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-white/40" />
          <div
            className="absolute top-5 left-5 h-0.5 bg-brand-charcoal transition-all duration-500"
            style={{
              width: `calc(${Math.max(0, currentStep) / (ORDER_STATUS_FLOW.length - 1)} * (100% - 2.5rem))`,
            }}
          />
          <div className="relative flex justify-between">
            {ORDER_STATUS_FLOW.map((status, i) => {
              const config = ORDER_STATUS_CONFIG[status];
              const Icon = STATUS_ICONS[status];
              const isComplete = currentStep > i;
              const isCurrent = currentStatus === status;
              const isUpcoming = currentStep < i;

              return (
                <button
                  key={status}
                  type="button"
                  disabled={updating || isCurrent}
                  onClick={() => onStatusChange(status)}
                  className="flex flex-col items-center gap-2 group disabled:cursor-default"
                  title={`Set to ${config.label}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrent
                        ? `${config.bg} ${config.text} border-current ring-4 ${config.ring} ring-offset-2`
                        : isComplete
                          ? "bg-brand-charcoal text-white border-brand-charcoal"
                          : isUpcoming
                            ? "bg-white/60 text-brand-muted border-white/60 group-hover:border-brand-charcoal group-hover:text-brand-charcoal"
                            : ""
                    }`}
                  >
                    {isComplete && !isCurrent ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-semibold text-center max-w-[4.5rem] leading-tight ${
                      isCurrent ? config.text : "text-brand-muted"
                    }`}
                  >
                    {config.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ORDER_STATUS_FLOW.map((status) => {
            const config = ORDER_STATUS_CONFIG[status];
            const Icon = STATUS_ICONS[status];
            const isActive = currentStatus === status;
            return (
              <motion.button
                key={status}
                type="button"
                disabled={updating || isActive}
                onClick={() => onStatusChange(status)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                  isActive
                    ? `${config.bg} ${config.text} border-current cursor-default`
                    : "bg-white/50 border-white/40 hover:border-brand-charcoal/30 hover:bg-white/80"
                } disabled:opacity-100`}
                whileTap={!isActive ? { scale: 0.98 } : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{config.label}</span>
                {isActive && <Check className="w-4 h-4 ml-auto shrink-0" />}
              </motion.button>
            );
          })}
        </div>

        {currentStatus !== "Cancelled" ? (
          <motion.button
            type="button"
            disabled={updating}
            onClick={() => onStatusChange("Cancelled")}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100 transition-colors mt-1"
            whileTap={{ scale: 0.98 }}
          >
            <XCircle className="w-4 h-4" />
            Cancel Order
          </motion.button>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Order Cancelled</p>
              <p className="text-xs text-red-600 mt-0.5">Select a status above to reactivate this order.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("Processing");
  const [internalNotes, setInternalNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    return subscribeOrders(setOrders);
  }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: orders.length };
    for (const s of ORDER_STATUSES) counts[s] = 0;
    for (const o of orders) counts[o.status] = (counts[o.status] || 0) + 1;
    return counts;
  }, [orders]);

  const filtered = statusFilter === "All" ? orders : orders.filter((o) => o.status === statusFilter);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((o) => o.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    const toUpdate = orders.filter((o) => selectedIds.has(o.id));
    setUpdating(true);
    try {
      await bulkUpdateOrderStatus(toUpdate, bulkStatus);
      showToast(`${toUpdate.length} orders updated`, "success");
      setSelectedIds(new Set());
    } catch {
      showToast("Bulk update failed", "error");
    } finally {
      setUpdating(false);
    }
  };

  const openOrder = (order: Order) => {
    setSelected(order);
    setInternalNotes(order.internalNotes || "");
  };

  const saveInternalNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await updateOrderInternalNotes(selected.id, internalNotes);
      setSelected({ ...selected, internalNotes });
      showToast("Notes saved", "success");
    } catch {
      showToast("Failed to save notes", "error");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleStatusChange = async (order: Order, status: OrderStatus) => {
    if (order.status === status) return;
    if (status === "Cancelled" && !window.confirm(`Cancel order #${order.orderId}?`)) return;

    setUpdating(true);
    try {
      const message = `Order #${order.orderId} has been updated to "${status}"${
        status === "Out for Delivery" ? ` — heading to ${order.delivery.district}` : ""
      }!`;
      await updateOrderStatus(order.orderId, order.id, status, order.userId, message);
      showToast(`Order moved to ${ORDER_STATUS_CONFIG[status].label}`, "success");
      setSelected({ ...order, status });
    } catch {
      showToast("Failed to update status", "error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Order Management</h2>
      <p className="text-sm text-brand-muted mb-6">{orders.length} total orders</p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setStatusFilter("All")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
            statusFilter === "All" ? "bg-black text-white" : "bg-white/60 hover:bg-white/80"
          }`}
        >
          All
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === "All" ? "bg-white/20" : "bg-black/10"}`}>
            {statusCounts.All}
          </span>
        </button>
        {ORDER_STATUSES.map((s) => {
          const config = ORDER_STATUS_CONFIG[s];
          const Icon = STATUS_ICONS[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? `${config.bg} ${config.text} ring-2 ${config.ring}`
                  : "bg-white/60 hover:bg-white/80"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {config.shortLabel}
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10">
                {statusCounts[s] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <div className={`${GLASS_CLASS} rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3`}>
          <span className="text-sm font-semibold">{selectedIds.size} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}
            className="px-3 py-2 rounded-lg bg-white/60 text-sm"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={updating}
            onClick={handleBulkUpdate}
            className="px-4 py-2 bg-brand-charcoal text-white rounded-full text-sm font-semibold disabled:opacity-50"
          >
            Apply to selected
          </button>
          <button type="button" onClick={() => setSelectedIds(new Set())} className="text-sm text-brand-muted hover:underline">
            Clear
          </button>
        </div>
      )}

      <div className={`${GLASS_CLASS} rounded-2xl overflow-hidden`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/20 text-left bg-white/20">
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4 hidden sm:table-cell">District</th>
              <th className="p-4">Total</th>
              <th className="p-4">Status</th>
              <th className="p-4 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr
                key={order.id}
                onClick={() => openOrder(order)}
                className="border-b border-white/10 cursor-pointer hover:bg-white/30 transition-colors"
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(order.id)}
                    onChange={() => toggleSelect(order.id)}
                  />
                </td>
                <td className="p-4 font-mono font-medium">{order.orderId}</td>
                <td className="p-4">
                  <p className="font-medium">{order.userName}</p>
                  <p className="text-xs text-brand-muted hidden md:block">{order.userEmail}</p>
                </td>
                <td className="p-4 hidden sm:table-cell text-brand-muted">{order.delivery.district}</td>
                <td className="p-4 font-semibold">{formatCurrency(order.total)}</td>
                <td className="p-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="p-4 text-brand-muted">
                  <ChevronRight className="w-4 h-4" />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-brand-muted">
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/30 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
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
                    <h3 className="text-xl font-bold">Order #{selected.orderId}</h3>
                    <p className="text-sm text-brand-muted mt-1">
                      {new Date(selected.createdAt).toLocaleDateString("en-LC", {
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
                    onClick={() => setSelected(null)}
                    className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <StatusBadge status={selected.status} size="md" />
                </div>

                <div className={`${GLASS_CLASS} rounded-2xl p-5 mb-6`}>
                  <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-brand-muted">
                    Update Status
                  </h4>
                  <OrderStatusStepper
                    currentStatus={selected.status}
                    onStatusChange={(status) => handleStatusChange(selected, status)}
                    updating={updating}
                  />
                </div>

                <div className="space-y-4 text-sm">
                  <div className={`${GLASS_CLASS} rounded-xl p-4`}>
                    <h4 className="font-semibold mb-2">Customer</h4>
                    <p>{selected.userName}</p>
                    <p className="text-brand-muted">{selected.userEmail}</p>
                    <p className="text-brand-muted">{selected.delivery.phone}</p>
                  </div>

                  <div className={`${GLASS_CLASS} rounded-xl p-4`}>
                    <h4 className="font-semibold mb-2">Delivery</h4>
                    <p>
                      <strong>District:</strong> {selected.delivery.district}
                    </p>
                    <p>
                      <strong>Community:</strong> {selected.delivery.community}
                    </p>
                    <p className="mt-2 text-brand-muted">{selected.delivery.directions}</p>
                  </div>

                  <div className={`${GLASS_CLASS} rounded-xl p-4`}>
                    <h4 className="font-semibold mb-2">Items</h4>
                    {selected.items.map((item, i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-white/10 last:border-0">
                        <span>
                          {item.title} ({item.size}/{item.color}) ×{item.quantity}
                        </span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div className="border-t border-white/20 mt-3 pt-3 font-bold flex justify-between text-base">
                      <span>Total</span>
                      <span>{formatCurrency(selected.total)}</span>
                    </div>
                  </div>

                  {selected.receiptUrl && (
                    <div className={`${GLASS_CLASS} rounded-xl p-4`}>
                      <h4 className="font-semibold mb-2">Bank Transfer Receipt</h4>
                      <div className="relative w-full h-64 rounded-lg overflow-hidden">
                        {isDataUrl(selected.receiptUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={selected.receiptUrl}
                            alt="Receipt"
                            className="w-full h-full object-contain bg-gray-50"
                          />
                        ) : (
                          <Image
                            src={selected.receiptUrl}
                            alt="Receipt"
                            fill
                            className="object-contain bg-gray-50"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <div className={`${GLASS_CLASS} rounded-xl p-4`}>
                    <h4 className="font-semibold mb-2">Internal Notes</h4>
                    <p className="text-xs text-brand-muted mb-2">Admin-only — not visible to customer</p>
                    <textarea
                      rows={3}
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Notes about verification, delivery issues, etc."
                      className="w-full px-3 py-2 rounded-xl border border-white/40 bg-white/60 text-sm resize-none"
                    />
                    <button
                      type="button"
                      disabled={savingNotes}
                      onClick={saveInternalNotes}
                      className="mt-2 px-4 py-2 bg-brand-charcoal text-white rounded-full text-xs font-semibold disabled:opacity-50"
                    >
                      {savingNotes ? "Saving..." : "Save Notes"}
                    </button>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
