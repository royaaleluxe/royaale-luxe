import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex flex-col items-center leading-none ${className}`}>
      <span className="font-script text-3xl md:text-4xl text-brand-charcoal tracking-wide">
        Royaale
      </span>
      <span className="font-sans text-sm md:text-base font-black text-black tracking-luxe uppercase mt-0.5">
        Luxe
      </span>
    </Link>
  );
}
