"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { subscribeOrders, subscribeAdminAlerts, markAdminAlertsRead } from "@/lib/firestore";
import { useStore } from "@/context/StoreContext";
import { getLowStockItems } from "@/lib/products";
import { formatCurrency, GLASS_CLASS, LOW_STOCK_THRESHOLD } from "@/lib/constants";
import type { Order, AdminAlert } from "@/lib/types";
import { DollarSign, Clock, Package, TrendingUp, AlertTriangle, Bell } from "lucide-react";

export function AdminDashboard() {
  const { products } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);

  useEffect(() => {
    return subscribeOrders(setOrders);
  }, []);

  useEffect(() => {
    return subscribeAdminAlerts(setAlerts);
  }, []);

  useEffect(() => {
    const unread = alerts.filter((a) => !a.read && a.type === "new_order");
    if (unread.length > 0) {
      markAdminAlertsRead(unread.map((a) => a.id)).catch(() => {});
    }
  }, [alerts]);

  const lowStock = getLowStockItems(products, LOW_STOCK_THRESHOLD);
  const unreadAlerts = alerts.filter((a) => !a.read);

  const totalRevenue = orders
    .filter((o) => o.status === "Completed")
    .reduce((sum, o) => sum + o.total, 0);

  const pendingCount = orders.filter((o) => o.status === "Pending Verification").length;
  const inventoryCount = products.reduce(
    (sum, p) => sum + p.variants.reduce((s, v) => s + v.quantity, 0),
    0
  );

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split("T")[0];
    const dayOrders = orders.filter((o) => o.createdAt.startsWith(dayStr));
    return {
      label: d.toLocaleDateString("en", { weekday: "short" }),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    };
  });

  const maxRevenue = Math.max(...last7Days.map((d) => d.revenue), 1);

  const stats = [
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: DollarSign },
    { label: "Pending Verification", value: String(pendingCount), icon: Clock },
    { label: "Active Inventory", value: String(inventoryCount), icon: Package },
    { label: "Total Orders", value: String(orders.length), icon: TrendingUp },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Analytics Dashboard</h2>

      {unreadAlerts.length > 0 && (
        <div className={`${GLASS_CLASS} rounded-2xl p-4 mb-6 border-l-4 border-amber-500`}>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold">New Order Alerts</h3>
          </div>
          <ul className="space-y-1 text-sm">
            {unreadAlerts.slice(0, 5).map((alert) => (
              <li key={alert.id} className="text-brand-muted">{alert.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${GLASS_CLASS} rounded-2xl p-6`}
          >
            <stat.icon className="w-5 h-5 text-brand-muted mb-3" />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-brand-muted">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className={`${GLASS_CLASS} rounded-2xl p-6 mb-6`}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold">Low Stock ({LOW_STOCK_THRESHOLD} or fewer units)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20 text-left">
                  <th className="py-2">Product</th>
                  <th className="py-2">Variant</th>
                  <th className="py-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.slice(0, 10).map((item, i) => (
                  <tr key={i} className="border-b border-white/10">
                    <td className="py-2">{item.title}</td>
                    <td className="py-2 text-brand-muted">
                      {item.color} / {item.size}
                    </td>
                    <td className="py-2 font-semibold text-amber-700">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={`${GLASS_CLASS} rounded-2xl p-6`}>
        <h3 className="font-semibold mb-6">7-Day Sales Trend</h3>
        <div className="flex items-end gap-3 h-40">
          {last7Days.map((day) => (
            <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
              <motion.div
                className="w-full bg-brand-pink-accent/80 rounded-t-lg"
                initial={{ height: 0 }}
                animate={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                transition={{ duration: 0.6 }}
                style={{ minHeight: day.revenue > 0 ? 8 : 2 }}
              />
              <span className="text-xs text-brand-muted">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${GLASS_CLASS} rounded-2xl p-6 mt-6`}>
        <h3 className="font-semibold mb-4">Recent Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 text-left">
                <th className="py-2">Order ID</th>
                <th className="py-2">Customer</th>
                <th className="py-2">Total</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="border-b border-white/10">
                  <td className="py-3 font-mono">{order.orderId}</td>
                  <td className="py-3">{order.userName}</td>
                  <td className="py-3">{formatCurrency(order.total)}</td>
                  <td className="py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-brand-pink/50">{order.status}</span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-brand-muted">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
