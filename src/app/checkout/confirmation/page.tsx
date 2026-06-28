"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { fetchOrderById } from "@/lib/firestore";
import { formatCurrency, BANKS, SPRING_TRANSITION, GLASS_CLASS } from "@/lib/constants";
import type { Order } from "@/lib/types";

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const orderId = searchParams.get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      router.replace("/");
      return;
    }
    if (authLoading) return;
    if (!user) {
      router.replace("/checkout");
      return;
    }
    fetchOrderById(orderId)
      .then((o) => {
        if (!o || o.userId !== user.uid) {
          router.replace("/account?tab=orders");
          return;
        }
        setOrder(o);
      })
      .finally(() => setLoading(false));
  }, [orderId, user, authLoading, router]);

  if (loading || !order) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center text-brand-muted">
        Loading confirmation...
      </div>
    );
  }

  const bank = BANKS.find((b) => b.id === order.bankId);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={SPRING_TRANSITION}
        className={`${GLASS_CLASS} rounded-3xl p-8 md:p-12 text-center`}
      >
        <div className="text-6xl mb-4">✦</div>
        <h1 className="font-script text-4xl text-brand-charcoal mb-2">Order Confirmed</h1>
        <p className="text-brand-muted mb-1">Thank you for shopping with Royaale Luxe</p>
        <p className="text-2xl font-bold text-black mb-6">#{order.orderId}</p>

        <div className="text-left space-y-4 mb-8 text-sm">
          <div className="p-4 rounded-xl bg-white/50">
            <p className="font-semibold mb-2">What happens next?</p>
            <ol className="list-decimal list-inside space-y-1 text-brand-muted">
              <li>Our team verifies your bank transfer receipt</li>
              <li>You&apos;ll receive an in-app notification when approved</li>
              <li>Your order ships to {order.delivery.district}</li>
            </ol>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-muted">Total paid</span>
            <span className="font-bold">{formatCurrency(order.total)}</span>
          </div>
          {bank && (
            <p className="text-xs text-brand-muted">
              Payment via {bank.name} · {order.items.length} item(s)
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/account/orders/${order.id}`}>
            <motion.span
              className="inline-block px-6 py-3 bg-brand-charcoal text-white rounded-full text-sm font-semibold"
              whileTap={{ scale: 0.98 }}
            >
              View Order Details
            </motion.span>
          </Link>
          <Link href="/">
            <motion.span
              className="inline-block px-6 py-3 border border-brand-charcoal/30 rounded-full text-sm font-semibold"
              whileTap={{ scale: 0.98 }}
            >
              Continue Shopping
            </motion.span>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center">Loading...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
