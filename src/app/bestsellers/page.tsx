import { Suspense } from "react";
import { ProductCatalog } from "@/components/Layout/ProductCatalog";
import { ProductGridSkeleton } from "@/components/Elements/Skeleton";

export default function BestsellersPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <ProductCatalog title="Bestsellers" filterKey="bestseller" showFilters={false} />
    </Suspense>
  );
}
