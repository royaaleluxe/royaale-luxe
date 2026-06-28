"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface UIContextValue {
  authModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  wishlistOpen: boolean;
  setWishlistOpen: (open: boolean) => void;
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
  overlayOpen: boolean;
  closeAllDrawers: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [cartOpen, setCartOpenRaw] = useState(false);
  const [wishlistOpen, setWishlistOpenRaw] = useState(false);
  const [navOpen, setNavOpenRaw] = useState(false);

  const closeAllDrawers = useCallback(() => {
    setCartOpenRaw(false);
    setWishlistOpenRaw(false);
    setNavOpenRaw(false);
  }, []);

  const setCartOpen = useCallback((open: boolean) => {
    if (open) {
      setWishlistOpenRaw(false);
      setNavOpenRaw(false);
    }
    setCartOpenRaw(open);
  }, []);

  const setWishlistOpen = useCallback((open: boolean) => {
    if (open) {
      setCartOpenRaw(false);
      setNavOpenRaw(false);
    }
    setWishlistOpenRaw(open);
  }, []);

  const setNavOpen = useCallback((open: boolean) => {
    if (open) {
      setCartOpenRaw(false);
      setWishlistOpenRaw(false);
    }
    setNavOpenRaw(open);
  }, []);

  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const overlayOpen = cartOpen || wishlistOpen || navOpen;

  return (
    <UIContext.Provider
      value={{
        authModalOpen,
        openAuthModal,
        closeAuthModal,
        cartOpen,
        setCartOpen,
        wishlistOpen,
        setWishlistOpen,
        navOpen,
        setNavOpen,
        overlayOpen,
        closeAllDrawers,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
