"use client";

import { AuthProvider } from "./AuthContext";
import { CartProvider } from "./CartContext";
import { StoreProvider } from "./StoreContext";
import { ToastProvider } from "./ToastContext";
import { UIProvider } from "./UIContext";
import { storefrontAuth } from "@/lib/firebase";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <AuthProvider authInstance={storefrontAuth}>
        <CartProvider>
          <ToastProvider>
            <UIProvider>{children}</UIProvider>
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </StoreProvider>
  );
}
