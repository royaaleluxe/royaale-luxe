import { GLASS_CLASS } from "@/lib/constants";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`${GLASS_CLASS} rounded-2xl animate-pulse ${className}`}>
      <div className="aspect-[3/4] bg-brand-pink/30 rounded-t-2xl" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-brand-pink/30 rounded w-3/4" />
        <div className="h-3 bg-brand-pink/20 rounded w-1/2" />
        <div className="h-4 bg-brand-pink/30 rounded w-1/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className={`${GLASS_CLASS} mx-3 md:mx-6 mt-6 rounded-3xl h-[50vh] md:h-[65vh] animate-pulse bg-brand-pink/20`} />
  );
}
