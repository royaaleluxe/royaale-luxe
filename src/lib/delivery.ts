import type { DistrictFee } from "./types";
import type { District } from "./constants";

export function getDistrictFee(
  districtFees: DistrictFee[],
  district: District | ""
): DistrictFee | undefined {
  if (!district) return undefined;
  return districtFees.find((f) => f.district === district);
}

export function formatEstimatedDelivery(fee?: DistrictFee): string | null {
  if (!fee) return null;
  const min = fee.minDays ?? 2;
  const max = fee.maxDays ?? 5;
  const start = new Date();
  start.setDate(start.getDate() + min);
  const end = new Date();
  end.setDate(end.getDate() + max);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-LC", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function getDefaultDeliveryEstimate(): string {
  const start = new Date();
  start.setDate(start.getDate() + 2);
  const end = new Date();
  end.setDate(end.getDate() + 5);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-LC", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}
