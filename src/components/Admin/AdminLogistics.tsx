"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { saveDistrictFee, saveSiteSettings } from "@/lib/firestore";
import { useToast } from "@/context/ToastContext";
import { formatCurrency, GLASS_CLASS, SAINT_LUCIA_DISTRICTS } from "@/lib/constants";
import { DEFAULT_DELIVERY_DAYS } from "@/lib/firestore";
import type { DistrictFee, DeliveryDay } from "@/lib/types";

export function AdminLogistics() {
  const { districtFees, settings } = useStore();
  const { showToast } = useToast();
  const [savingDistrict, setSavingDistrict] = useState<string | null>(null);
  const [savingDays, setSavingDays] = useState(false);
  const [localFees, setLocalFees] = useState<DistrictFee[]>([]);
  const [deliveryDays, setDeliveryDays] = useState<DeliveryDay[]>([]);
  const [newDayLabel, setNewDayLabel] = useState("");

  useEffect(() => {
    setLocalFees(districtFees);
  }, [districtFees]);

  useEffect(() => {
    const days = settings?.deliveryDays?.length
      ? settings.deliveryDays
      : DEFAULT_DELIVERY_DAYS.map((d) => ({ ...d }));
    setDeliveryDays(days);
  }, [settings]);

  const updateFee = (district: string, patch: Partial<DistrictFee>) => {
    setLocalFees((prev) =>
      prev.map((f) => (f.district === district ? { ...f, ...patch } : f))
    );
  };

  const handleSaveDistrict = async (district: string) => {
    const fee = localFees.find((f) => f.district === district);
    if (!fee) return;
    setSavingDistrict(district);
    try {
      await saveDistrictFee(fee);
      showToast(`${district} updated`, "success");
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSavingDistrict(null);
    }
  };

  const handleSaveAllDistricts = async () => {
    setSavingDistrict("all");
    try {
      await Promise.all(localFees.map((f) => saveDistrictFee(f)));
      showToast("All districts saved", "success");
    } catch {
      showToast("Failed to save districts", "error");
    } finally {
      setSavingDistrict(null);
    }
  };

  const toggleDeliveryDay = (id: string) => {
    setDeliveryDays((prev) =>
      prev.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    );
  };

  const addDeliveryDay = () => {
    const label = newDayLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, "-");
    if (deliveryDays.some((d) => d.id === id)) {
      showToast("Day already exists", "error");
      return;
    }
    setDeliveryDays((prev) => [...prev, { id, label, active: true }]);
    setNewDayLabel("");
  };

  const removeDeliveryDay = (id: string) => {
    setDeliveryDays((prev) => prev.filter((d) => d.id !== id));
  };

  const handleSaveDeliveryDays = async () => {
    if (!settings) return;
    setSavingDays(true);
    try {
      await saveSiteSettings({ ...settings, deliveryDays });
      showToast("Delivery schedule saved", "success");
    } catch {
      showToast("Failed to save schedule", "error");
    } finally {
      setSavingDays(false);
    }
  };

  const activeDays = deliveryDays.filter((d) => d.active).map((d) => d.label);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold mb-1">Delivery Schedule</h2>
        <p className="text-brand-muted text-sm mb-4">
          Choose which days you deliver. Shown to customers at checkout.
        </p>
        <div className={`${GLASS_CLASS} rounded-2xl p-4`}>
          <div className="flex flex-wrap gap-2 mb-4">
            {deliveryDays.map((day) => (
              <div key={day.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleDeliveryDay(day.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    day.active
                      ? "bg-brand-charcoal text-white"
                      : "bg-white/60 text-brand-muted border border-white/40"
                  }`}
                >
                  {day.label}
                </button>
                <button
                  type="button"
                  onClick={() => removeDeliveryDay(day.id)}
                  className="p-1 text-brand-muted hover:text-red-500"
                  aria-label={`Remove ${day.label}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <input
              placeholder="Add day (e.g. Public Holiday)"
              value={newDayLabel}
              onChange={(e) => setNewDayLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDeliveryDay())}
              className="flex-1 px-3 py-2 rounded-xl border border-white/40 bg-white/60 text-sm"
            />
            <button
              type="button"
              onClick={addDeliveryDay}
              className="px-3 py-2 bg-brand-pink rounded-xl text-sm font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          {activeDays.length > 0 && (
            <p className="text-xs text-brand-muted mb-3">
              Active: {activeDays.join(", ")}
            </p>
          )}
          <button
            type="button"
            onClick={handleSaveDeliveryDays}
            disabled={savingDays}
            className="px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {savingDays ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">District Fees</h2>
            <p className="text-brand-muted text-sm">Delivery fee and ETA per district</p>
          </div>
          <button
            type="button"
            onClick={handleSaveAllDistricts}
            disabled={savingDistrict === "all"}
            className="px-4 py-2 bg-black text-white rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {savingDistrict === "all" ? "Saving..." : "Save All"}
          </button>
        </div>

        <div className={`${GLASS_CLASS} rounded-2xl overflow-hidden`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/20 bg-white/20 text-left text-xs uppercase tracking-wider text-brand-muted">
                <th className="p-3">District</th>
                <th className="p-3 w-24">Fee (XCD)</th>
                <th className="p-3 w-20">Min days</th>
                <th className="p-3 w-20">Max days</th>
                <th className="p-3 w-16">On</th>
                <th className="p-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {SAINT_LUCIA_DISTRICTS.map((district) => {
                const fee = localFees.find((f) => f.district === district) || {
                  district,
                  fee: 15,
                  active: true,
                  minDays: 2,
                  maxDays: 5,
                };
                return (
                  <tr key={district} className="border-b border-white/10">
                    <td className="p-3 font-medium">{district}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={fee.fee}
                        onChange={(e) => updateFee(district, { fee: Number(e.target.value) })}
                        className="w-full px-2 py-1 rounded-lg border border-white/40 bg-white/60 text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        value={fee.minDays ?? 2}
                        onChange={(e) => updateFee(district, { minDays: Number(e.target.value) })}
                        className="w-full px-2 py-1 rounded-lg border border-white/40 bg-white/60 text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        value={fee.maxDays ?? 5}
                        onChange={(e) => updateFee(district, { maxDays: Number(e.target.value) })}
                        className="w-full px-2 py-1 rounded-lg border border-white/40 bg-white/60 text-sm"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={fee.active}
                        onChange={(e) => updateFee(district, { active: e.target.checked })}
                      />
                    </td>
                    <td className="p-3">
                      <motion.button
                        type="button"
                        onClick={() => handleSaveDistrict(district)}
                        disabled={savingDistrict === district}
                        className="text-xs font-semibold text-brand-charcoal hover:text-black disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        {savingDistrict === district ? "..." : "Save"}
                      </motion.button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-brand-muted mt-2">
          Inactive districts are hidden at checkout. Fee preview: {formatCurrency(15)}–
          {formatCurrency(localFees[localFees.length - 1]?.fee ?? 33)}
        </p>
      </div>
    </div>
  );
}
