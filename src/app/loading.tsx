import { ProductGridSkeleton, HeroSkeleton } from "@/components/Elements/Skeleton";

export default function Loading() {
  return (
    <div className="pb-12">
      <HeroSkeleton />
      <div className="max-w-7xl mx-auto px-4 md:px-6 mt-16">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}
