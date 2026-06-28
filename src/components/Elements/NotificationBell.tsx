"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { markNotificationsRead } from "@/lib/firestore";
import { useUI } from "@/context/UIContext";
import { SPRING_TRANSITION } from "@/lib/constants";

export function NotificationBell() {
  const { user, profile } = useAuth();
  const { openAuthModal } = useUI();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const notifications = profile?.notifications || [];
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = async () => {
    if (!user) {
      openAuthModal();
      return;
    }
    setOpen(!open);
    if (!open && unread > 0) {
      await markNotificationsRead(user.uid);
    }
  };

  return (
    <div ref={ref} className="relative">
      <motion.button
        onClick={handleClick}
        className="relative p-2 rounded-full hover:bg-white/40 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-brand-charcoal" />
        {user && unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full"
          >
            {unread}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && user && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={SPRING_TRANSITION}
            className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-white/95 backdrop-blur-xl border border-white/30 rounded-2xl shadow-glass z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-white/20">
              <h3 className="font-sans font-semibold text-brand-charcoal">Notifications</h3>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-sm text-brand-muted">No notifications yet</p>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 border-b border-white/10 text-sm ${n.read ? "text-brand-muted" : "text-brand-charcoal font-medium"}`}
                  >
                    {n.message}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
