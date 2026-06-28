"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { ProductDetail } from "@/components/Elements/ProductDetail";
import { RecentlyViewedSection } from "@/components/Elements/RecentlyViewedSection";
import { Skeleton } from "@/components/Elements/Skeleton";
import { addRecentlyViewed } from "@/lib/recentlyViewed";
import { processBackInStockAlerts } from "@/lib/firestore";
import { useAuth } from "@/context/AuthContext";
import { SPRING_TRANSITION } from "@/lib/constants";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { products, loading } = useStore();
  const { user } = useAuth();
  const product = products.find((p) => p.id === id);

  useEffect(() => {
    if (id) addRecentlyViewed(id);
  }, [id]);

  useEffect(() => {
    if (user && products.length) {
      processBackInStockAlerts(user.uid, products).catch(() => {});
    }
  }, [user, products]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <Skeleton className="max-w-4xl mx-auto" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 text-center">
        <h1 className="font-display text-3xl mb-4">Product Not Found</h1>
        <Link href="/" className="text-sm font-semibold text-brand-pink-accent hover:underline">
          Return to collection
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={SPRING_TRANSITION}>
        <Link
          href="/collections"
          className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-charcoal mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to collection
        </Link>
      </motion.div>
      <ProductDetail product={product} />
      <RecentlyViewedSection />
    </div>
  );
}
