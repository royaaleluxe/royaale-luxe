"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { subscribeProducts, subscribeDistrictFees, subscribeSiteSettings, subscribePromos } from "@/lib/firestore";
import type { Product, DistrictFee, SiteSettings, PromoCode } from "@/lib/types";

interface StoreContextValue {
  products: Product[];
  districtFees: DistrictFee[];
  settings: SiteSettings | null;
  promos: PromoCode[];
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [districtFees, setDistrictFees] = useState<DistrictFee[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let loaded = { products: false, fees: false, settings: false, promos: false };
    const check = () => {
      if (loaded.products && loaded.fees && loaded.settings && loaded.promos) setLoading(false);
    };

    const timeout = window.setTimeout(() => setLoading(false), 8000);

    const unsubProducts = subscribeProducts((p) => {
      setProducts(p);
      loaded.products = true;
      check();
    });
    const unsubFees = subscribeDistrictFees((f) => {
      setDistrictFees(f);
      loaded.fees = true;
      check();
    });
    const unsubSettings = subscribeSiteSettings((s) => {
      setSettings(s);
      loaded.settings = true;
      check();
    });
    const unsubPromos = subscribePromos((p) => {
      setPromos(p);
      loaded.promos = true;
      check();
    });

    return () => {
      clearTimeout(timeout);
      unsubProducts();
      unsubFees();
      unsubSettings();
      unsubPromos();
    };
  }, []);

  return (
    <StoreContext.Provider value={{ products, districtFees, settings, promos, loading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
