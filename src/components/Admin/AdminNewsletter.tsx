"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Mail, Users } from "lucide-react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { adminDb } from "@/lib/firebase";
import { GLASS_CLASS, SPRING_TRANSITION } from "@/lib/constants";
import type { NewsletterSubscriber } from "@/lib/types";

export function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminDb) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      query(collection(adminDb, "newsletter"), orderBy("subscribedAt", "desc")),
      (snap) => {
        setSubscribers(
          snap.docs.map((d) => ({
            id: d.id,
            email: (d.data().email as string) || "",
            subscribedAt: (d.data().subscribedAt as string) || "",
            source: d.data().source as string | undefined,
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  const exportCsv = () => {
    const rows = [
      ["Email", "Subscribed At", "Source"],
      ...subscribers.map((s) => [s.email, s.subscribedAt, s.source || "website"]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `royaale-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Newsletter Subscribers</h2>
          <p className="text-sm text-brand-muted mt-1">
            {loading ? "Loading..." : `${subscribers.length} subscriber${subscribers.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <motion.button
          onClick={exportCsv}
          disabled={subscribers.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_TRANSITION}
        >
          <Download className="w-4 h-4" /> Export CSV
        </motion.button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className={`${GLASS_CLASS} rounded-2xl p-5 flex items-center gap-4`}>
          <div className="p-3 rounded-xl bg-brand-pink/40">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-muted">Total</p>
            <p className="text-2xl font-bold">{subscribers.length}</p>
          </div>
        </div>
        <div className={`${GLASS_CLASS} rounded-2xl p-5 flex items-center gap-4`}>
          <div className="p-3 rounded-xl bg-brand-pink/40">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-muted">This month</p>
            <p className="text-2xl font-bold">
              {
                subscribers.filter((s) => {
                  const d = new Date(s.subscribedAt);
                  const now = new Date();
                  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).length
              }
            </p>
          </div>
        </div>
      </div>

      <div className={`${GLASS_CLASS} rounded-2xl overflow-hidden`}>
        {loading ? (
          <p className="p-8 text-center text-brand-muted animate-pulse">Loading subscribers...</p>
        ) : subscribers.length === 0 ? (
          <p className="p-12 text-center text-brand-muted">No subscribers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/30 text-left text-xs uppercase tracking-wider text-brand-muted">
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Subscribed</th>
                  <th className="px-5 py-3 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b border-white/10 last:border-0 hover:bg-white/30">
                    <td className="px-5 py-3 font-medium">{sub.email}</td>
                    <td className="px-5 py-3 text-brand-muted">
                      {sub.subscribedAt
                        ? new Date(sub.subscribedAt).toLocaleDateString("en-LC", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-brand-muted capitalize">{sub.source || "website"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
