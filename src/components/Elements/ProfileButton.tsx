"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { User, LogOut, Settings, Package, Heart, ChevronDown, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useUI } from "@/context/UIContext";
import { useToast } from "@/context/ToastContext";
import { SPRING_TRANSITION } from "@/lib/constants";

export function ProfileButton() {
  const { user, profile, signOut } = useAuth();
  const { openAuthModal, setWishlistOpen, closeAllDrawers } = useUI();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setOpen(false);
      showToast("Signed out successfully", "success");
    } catch {
      showToast("Failed to sign out", "error");
    }
  };

  if (!user) {
    return (
      <motion.button
        onClick={openAuthModal}
        className="p-2 rounded-full hover:bg-brand-pink/60 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Sign in"
      >
        <User className="w-5 h-5 text-brand-charcoal" />
      </motion.button>
    );
  }

  const displayName = profile?.firstName || user.email?.split("@")[0] || "there";

  const menuItems = [
    {
      label: "Account Settings",
      icon: Settings,
      onClick: () => {
        setOpen(false);
        closeAllDrawers();
      },
      href: "/account?tab=profile",
    },
    {
      label: "Order History",
      icon: Package,
      onClick: () => {
        setOpen(false);
        closeAllDrawers();
      },
      href: "/account?tab=orders",
    },
    {
      label: "Saved Addresses",
      icon: MapPin,
      onClick: () => {
        setOpen(false);
        closeAllDrawers();
      },
      href: "/account?tab=addresses",
    },
    {
      label: "Wishlist",
      icon: Heart,
      onClick: () => {
        setOpen(false);
        setWishlistOpen(true);
      },
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-brand-pink/60 transition-colors"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={SPRING_TRANSITION}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="w-8 h-8 rounded-full bg-brand-charcoal text-white flex items-center justify-center text-xs font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span className="hidden sm:block text-sm font-semibold text-brand-charcoal max-w-[100px] truncate">
          Hi, {displayName}
        </span>
        <ChevronDown className={`w-4 h-4 text-brand-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 bg-white/95 backdrop-blur-xl rounded-2xl shadow-glass border border-brand-pink-accent/30 py-2 z-[100]"
            role="menu"
          >
            <div className="px-4 py-2 border-b border-brand-pink-accent/20 mb-1">
              <p className="text-sm font-semibold text-brand-charcoal truncate">
                {profile?.firstName} {profile?.lastName}
              </p>
              <p className="text-xs text-brand-muted truncate">{profile?.email || user.email}</p>
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const content = (
                <>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </>
              );
              if (item.href) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={item.onClick}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-brand-charcoal hover:bg-brand-pink/50 transition-colors"
                    role="menuitem"
                  >
                    {content}
                  </Link>
                );
              }
              return (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-charcoal hover:bg-brand-pink/50 transition-colors"
                  role="menuitem"
                >
                  {content}
                </button>
              );
            })}
            <div className="border-t border-brand-pink-accent/20 mt-1 pt-1">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                role="menuitem"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
