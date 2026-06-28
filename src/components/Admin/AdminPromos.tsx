"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Tag } from "lucide-react";
import { savePromo, deletePromo } from "@/lib/firestore";
import { generateBulkPromosViaApi } from "@/lib/api-client";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, GLASS_CLASS, SPRING_TRANSITION } from "@/lib/constants";
import type { PromoCode } from "@/lib/types";

const emptyPromo = (): PromoCode => ({
  id: "",
  code: "",
  discountPercent: 10,
  active: true,
  description: "",
  createdAt: new Date().toISOString(),
});

export function AdminPromos() {
  const { showToast } = useToast();
  const { promos } = useStore();
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    prefix: "LUXE",
    count: 10,
    discountPercent: 15,
    description: "",
    expiresAt: "",
    minOrderAmount: "",
  });
  const [generatedCodes, setGeneratedCodes] = useState<{ code: string; id: string }[]>([]);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.code.trim()) {
      showToast("Promo code is required", "error");
      return;
    }
    if (editing.discountPercent <= 0 || editing.discountPercent > 100) {
      showToast("Discount must be between 1 and 100%", "error");
      return;
    }

    setSaving(true);
    try {
      await savePromo(editing);
      showToast(editing.id ? "Promo updated" : "Promo created", "success");
      setEditing(null);
    } catch {
      showToast("Failed to save promo", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promo code?")) return;
    try {
      await deletePromo(id);
      showToast("Promo deleted", "success");
    } catch {
      showToast("Failed to delete promo", "error");
    }
  };

  const handleBulkGenerate = async () => {
    if (!bulkForm.prefix.trim()) {
      showToast("Prefix is required", "error");
      return;
    }
    setBulkSaving(true);
    try {
      const result = await generateBulkPromosViaApi({
        prefix: bulkForm.prefix.toUpperCase(),
        count: bulkForm.count,
        discountPercent: bulkForm.discountPercent,
        description: bulkForm.description || undefined,
        expiresAt: bulkForm.expiresAt ? new Date(bulkForm.expiresAt).toISOString() : undefined,
        minOrderAmount: bulkForm.minOrderAmount ? Number(bulkForm.minOrderAmount) : undefined,
        active: true,
      });
      setGeneratedCodes(result.promos);
      showToast(`Generated ${result.count} promo codes`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Bulk generation failed", "error");
    } finally {
      setBulkSaving(false);
    }
  };

  const copyAllCodes = () => {
    const text = generatedCodes.map((p) => p.code).join("\n");
    navigator.clipboard.writeText(text).then(() => showToast("Codes copied", "success"));
  };

  const isExpired = (promo: PromoCode) =>
    promo.expiresAt ? new Date(promo.expiresAt) < new Date() : false;

  const isScheduled = (promo: PromoCode) =>
    promo.startsAt ? new Date(promo.startsAt) > new Date() : false;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Promo Codes</h2>
          <p className="text-sm text-brand-muted mt-1">
            Create and manage discount codes for checkout
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <motion.button
          onClick={() => setEditing(emptyPromo())}
          className="flex items-center gap-2 px-5 py-2.5 bg-black text-white rounded-full text-sm font-semibold"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_TRANSITION}
        >
          <Plus className="w-4 h-4" /> New Promo
        </motion.button>
        <motion.button
          onClick={() => {
            setBulkOpen(!bulkOpen);
            setGeneratedCodes([]);
          }}
          className="flex items-center gap-2 px-5 py-2.5 border border-brand-charcoal/20 rounded-full text-sm font-semibold"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_TRANSITION}
        >
          <Tag className="w-4 h-4" /> Bulk Generate
        </motion.button>
        </div>
      </div>

      {bulkOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GLASS_CLASS} rounded-2xl p-6 mb-6 space-y-4`}
        >
          <h3 className="font-semibold">Bulk Generate Promo Codes</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <input
              placeholder="Prefix (e.g. LUXE)"
              value={bulkForm.prefix}
              onChange={(e) =>
                setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })
              }
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm font-mono"
            />
            <input
              type="number"
              min={1}
              max={100}
              placeholder="Count"
              value={bulkForm.count}
              onChange={(e) => setBulkForm({ ...bulkForm, count: Number(e.target.value) })}
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
            <input
              type="number"
              min={1}
              max={100}
              placeholder="Discount %"
              value={bulkForm.discountPercent}
              onChange={(e) => setBulkForm({ ...bulkForm, discountPercent: Number(e.target.value) })}
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
            <input
              placeholder="Description (optional)"
              value={bulkForm.description}
              onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm sm:col-span-2"
            />
            <input
              type="datetime-local"
              value={bulkForm.expiresAt}
              onChange={(e) => setBulkForm({ ...bulkForm, expiresAt: e.target.value })}
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
            <input
              type="number"
              placeholder="Min order (optional)"
              value={bulkForm.minOrderAmount}
              onChange={(e) => setBulkForm({ ...bulkForm, minOrderAmount: e.target.value })}
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <motion.button
              onClick={handleBulkGenerate}
              disabled={bulkSaving}
              className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {bulkSaving ? "Generating..." : `Generate ${bulkForm.count} Codes`}
            </motion.button>
            {generatedCodes.length > 0 && (
              <button
                onClick={copyAllCodes}
                className="px-6 py-2.5 rounded-full text-sm font-semibold border border-white/40"
              >
                Copy All ({generatedCodes.length})
              </button>
            )}
          </div>
          {generatedCodes.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {generatedCodes.map((p) => (
                <span
                  key={p.id}
                  className="px-3 py-1 rounded-full bg-brand-pink/60 font-mono text-xs font-semibold"
                >
                  {p.code}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {editing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${GLASS_CLASS} rounded-2xl p-6 mb-6 space-y-4`}
        >
          <h3 className="font-semibold">{editing.id ? "Edit Promo" : "Create Promo"}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              placeholder="Code (e.g. LUXE10)"
              value={editing.code}
              onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm font-mono"
            />
            <input
              type="number"
              placeholder="Discount %"
              value={editing.discountPercent}
              onChange={(e) =>
                setEditing({ ...editing, discountPercent: Number(e.target.value) })
              }
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
            <input
              placeholder="Description (optional)"
              value={editing.description || ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm sm:col-span-2"
            />
            <input
              type="datetime-local"
              value={editing.startsAt?.slice(0, 16) || ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  startsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                })
              }
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
              title="Start date"
            />
            <input
              type="datetime-local"
              value={editing.expiresAt?.slice(0, 16) || ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  expiresAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                })
              }
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
            <input
              type="number"
              placeholder="Min order amount (optional)"
              value={editing.minOrderAmount ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  minOrderAmount: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="px-4 py-3 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
            />
            Active
          </label>
          <div className="flex gap-3">
            <motion.button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-black text-white rounded-full text-sm font-semibold disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {saving ? "Saving..." : "Save Promo"}
            </motion.button>
            <button
              onClick={() => setEditing(null)}
              className="px-6 py-2.5 rounded-full text-sm font-semibold border border-white/40"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid gap-4">
        {promos.map((promo) => (
          <motion.div
            key={promo.id}
            layout
            className={`${GLASS_CLASS} rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-brand-pink/40">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-lg">{promo.code}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-brand-charcoal text-white">
                    {promo.discountPercent}% off
                  </span>
                  {!promo.active && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600">
                      Inactive
                    </span>
                  )}
                  {isScheduled(promo) && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                      Scheduled
                    </span>
                  )}
                  {isExpired(promo) && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                      Expired
                    </span>
                  )}
                </div>
                {promo.description && (
                  <p className="text-sm text-brand-muted mt-1">{promo.description}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-brand-muted">
                  {promo.startsAt && (
                    <span>Starts {new Date(promo.startsAt).toLocaleDateString()}</span>
                  )}
                  {promo.expiresAt && (
                    <span>Expires {new Date(promo.expiresAt).toLocaleDateString()}</span>
                  )}
                  {promo.minOrderAmount != null && (
                    <span>Min order {formatCurrency(promo.minOrderAmount)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(promo)}
                className="px-4 py-2 rounded-full text-xs font-semibold bg-white/60 hover:bg-white/80"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(promo.id)}
                className="p-2 rounded-full hover:bg-red-50 text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
        {promos.length === 0 && (
          <div className={`${GLASS_CLASS} rounded-2xl p-12 text-center text-brand-muted`}>
            <Tag className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No promo codes yet. Create one to offer discounts at checkout.</p>
          </div>
        )}
      </div>
    </div>
  );
}
