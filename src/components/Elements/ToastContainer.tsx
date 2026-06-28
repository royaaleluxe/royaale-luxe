"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useToast } from "@/context/ToastContext";

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl backdrop-blur-xl border shadow-glass min-w-[280px] ${
              toast.type === "success"
                ? "bg-emerald-50/90 border-emerald-200 text-emerald-800"
                : toast.type === "error"
                  ? "bg-red-50/90 border-red-200 text-red-800"
                  : "bg-white/90 border-white/30 text-brand-charcoal"
            }`}
          >
            <p className="text-sm flex-1">{toast.message}</p>
            <button onClick={() => dismissToast(toast.id)}>
              <X className="w-4 h-4 opacity-50" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
