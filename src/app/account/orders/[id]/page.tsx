"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Download, RefreshCw, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { fetchOrderById } from "@/lib/firestore";
import { cancelOrderViaApi } from "@/lib/api-client";
import { isDataUrl } from "@/lib/storage";
import { CustomerOrderStepper } from "@/components/Elements/CustomerOrderStepper";
import { ProductImage } from "@/components/Elements/ProductImage";
import {
  formatCurrency,
  BANKS,
  GLASS_CLASS,
  SPRING_TRANSITION,
  ORDER_STATUS_CONFIG,
} from "@/lib/constants";
import type { Order } from "@/lib/types";

function OrderDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [pullStart, setPullStart] = useState(0);
  const [pulling, setPulling] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const o = await fetchOrderById(id);
      if (!o || o.userId !== user.uid) {
        router.replace("/account?tab=orders");
        return;
      }
      setOrder(o);
    } finally {
      setLoading(false);
    }
  }, [id, user, router]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/account");
      return;
    }
    loadOrder();
  }, [user, authLoading, loadOrder, router]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) setPullStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStart && e.touches[0].clientY - pullStart > 80) setPulling(true);
  };

  const handleTouchEnd = () => {
    if (pulling) loadOrder();
    setPullStart(0);
    setPulling(false);
  };

  const downloadReceipt = () => {
    if (!order?.receiptUrl) return;
    const a = document.createElement("a");
    a.href = order.receiptUrl;
    a.download = `receipt-${order.orderId}.jpg`;
    a.target = "_blank";
    a.click();
  };

  const handleCancel = async () => {
    if (!order || !id) return;
    if (!confirm("Cancel this order? Inventory will be restored to stock.")) return;
    setCancelling(true);
    try {
      await cancelOrderViaApi(id);
      showToast("Order cancelled successfully", "success");
      await loadOrder();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Cancellation failed", "error");
    } finally {
      setCancelling(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 animate-pulse">
        <div className={`${GLASS_CLASS} rounded-2xl h-96`} />
      </div>
    );
  }

  const bank = BANKS.find((b) => b.id === order.bankId);
  const statusConfig = ORDER_STATUS_CONFIG[order.status];

  return (
    <div
      className="max-w-3xl mx-auto px-4 md:px-6 py-8"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pulling && (
        <div className="text-center text-xs text-brand-muted mb-2 flex items-center justify-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin" /> Release to refresh
        </div>
      )}

      <Link
        href="/account?tab=orders"
        className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-charcoal mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to orders
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING_TRANSITION}
        className="space-y-6"
      >
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold italic">Order #{order.orderId}</h1>
            <p className="text-sm text-brand-muted mt-1">
              {new Date(order.createdAt).toLocaleDateString("en-LC", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
            {order.status}
          </span>
        </div>

        <div className={`${GLASS_CLASS} rounded-2xl p-6`}>
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-brand-muted">Order Progress</h2>
          <CustomerOrderStepper status={order.status} />
        </div>

        <div className={`${GLASS_CLASS} rounded-2xl p-6 space-y-3`}>
          <h2 className="font-semibold text-sm uppercase tracking-wider text-brand-muted">Items</h2>
          {order.items.map((item, i) => (
            <div key={i} className="flex gap-3 py-2 border-b border-white/10 last:border-0">
              <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
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
          <div className="pt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-muted">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Delivery</span>
              <span>{formatCurrency(order.deliveryFee)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-white/20">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        <div className={`${GLASS_CLASS} rounded-2xl p-6 text-sm space-y-2`}>
          <h2 className="font-semibold text-sm uppercase tracking-wider text-brand-muted mb-2">Delivery</h2>
          <p><strong>{order.delivery.district}</strong> — {order.delivery.community}</p>
          <p className="text-brand-muted">{order.delivery.directions}</p>
          <p className="text-brand-muted">Phone: {order.delivery.phone}</p>
        </div>

        {bank && (
          <div className={`${GLASS_CLASS} rounded-2xl p-6 text-sm`}>
            <p><strong>Payment:</strong> {bank.name}</p>
            {order.couponCode && <p className="text-brand-muted mt-1">Coupon: {order.couponCode}</p>}
          </div>
        )}

        {order.receiptUrl && (
          <div className={`${GLASS_CLASS} rounded-2xl p-6`}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-brand-muted">Receipt</h2>
              <button
                type="button"
                onClick={downloadReceipt}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-pink-accent hover:underline"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
            <div className="relative w-full h-48 rounded-lg overflow-hidden">
              {isDataUrl(order.receiptUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.receiptUrl} alt="Receipt" className="w-full h-full object-contain bg-gray-50" />
              ) : (
                <Image src={order.receiptUrl} alt="Receipt" fill className="object-contain bg-gray-50" />
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={loadOrder}
          className="w-full py-2.5 text-sm font-semibold text-brand-muted hover:text-brand-charcoal flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh status
        </button>

        {order.status === "Pending Verification" && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full py-3 text-sm font-semibold text-red-600 border border-red-200 rounded-full hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            {cancelling ? "Cancelling..." : "Cancel Order"}
          </button>
        )}
      </motion.div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-brand-muted">Loading...</div>}>
      <OrderDetailContent />
    </Suspense>
  );
}
