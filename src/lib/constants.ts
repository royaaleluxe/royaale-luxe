export const SAINT_LUCIA_DISTRICTS = [
  "Castries",
  "Gros Islet",
  "Soufrière",
  "Vieux Fort",
  "Choiseul",
  "Laborie",
  "Micoud",
  "Dennery",
  "Anse la Raye",
  "Canaries",
] as const;

export type District = (typeof SAINT_LUCIA_DISTRICTS)[number];

export const PRODUCT_SIZES = ["S", "M", "L", "XL"] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];

export const ORDER_STATUSES = [
  "Pending Verification",
  "Processing",
  "Out for Delivery",
  "Completed",
  "Cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "Pending Verification",
  "Processing",
  "Out for Delivery",
  "Completed",
];

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; shortLabel: string; bg: string; text: string; ring: string; step: number }
> = {
  "Pending Verification": {
    label: "Pending Verification",
    shortLabel: "Pending",
    bg: "bg-amber-100",
    text: "text-amber-800",
    ring: "ring-amber-400",
    step: 0,
  },
  Processing: {
    label: "Processing",
    shortLabel: "Processing",
    bg: "bg-blue-100",
    text: "text-blue-800",
    ring: "ring-blue-400",
    step: 1,
  },
  "Out for Delivery": {
    label: "Out for Delivery",
    shortLabel: "Delivering",
    bg: "bg-violet-100",
    text: "text-violet-800",
    ring: "ring-violet-400",
    step: 2,
  },
  Completed: {
    label: "Completed",
    shortLabel: "Completed",
    bg: "bg-emerald-100",
    text: "text-emerald-800",
    ring: "ring-emerald-400",
    step: 3,
  },
  Cancelled: {
    label: "Cancelled",
    shortLabel: "Cancelled",
    bg: "bg-red-100",
    text: "text-red-800",
    ring: "ring-red-400",
    step: -1,
  },
};

export const BANKS = [
  { id: "bosl", name: "Bank of Saint Lucia (BOSL)", account: "0012345678", holder: "Royaale Luxe Ltd." },
  { id: "republic", name: "Republic Bank (EC) Limited", account: "9876543210", holder: "Royaale Luxe Ltd." },
  { id: "1st-national", name: "1st National Bank St. Lucia", account: "1122334455", holder: "Royaale Luxe Ltd." },
  { id: "cibc", name: "CIBC Caribbean", account: "5566778899", holder: "Royaale Luxe Ltd." },
] as const;

export const SPRING_TRANSITION = { type: "spring" as const, stiffness: 400, damping: 17 };
export const HOVER_SPRING = { whileHover: { scale: 1.02, y: -2 }, whileTap: { scale: 0.98 }, transition: SPRING_TRANSITION };

export const GLASS_CLASS =
  "bg-brand-pink/50 backdrop-blur-xl border border-brand-pink-accent/30 shadow-glass";
export const HEADER_GLASS =
  "bg-brand-pink-accent/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300";
export const OVERLAY_BACKDROP = "fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm";
export const OVERLAY_PANEL = "fixed top-0 h-full z-[210] bg-brand-pink/95 backdrop-blur-xl border-brand-pink-accent/40 shadow-glass";

export function formatCurrency(amount: number, currency: "XCD" | "USD" = "XCD") {
  return new Intl.NumberFormat("en-LC", { style: "currency", currency }).format(amount);
}

export const LOW_STOCK_THRESHOLD = 5;

export function generateOrderId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `RL-${ts}-${rand}`;
}
