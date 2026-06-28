import { Suspense } from "react";
import { ProductCatalog } from "@/components/Layout/ProductCatalog";
import { ProductGridSkeleton } from "@/components/Elements/Skeleton";

export default function NewArrivalsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton />}>
      <ProductCatalog title="New Arrivals" filterKey="newArrival" showFilters={false} />
    </Suspense>
  );
}
