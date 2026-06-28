import type { PromoCode, SiteSettings } from "./types";

export interface PromoValidationResult {
  valid: boolean;
  promo: PromoCode | null;
  message: string;
}

export function validatePromoCode(
  code: string,
  subtotal: number,
  promos: PromoCode[],
  settings?: SiteSettings | null
): PromoValidationResult {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { valid: false, promo: null, message: "" };
  }

  const now = new Date();

  const fromPromos = promos.find((p) => p.code.toUpperCase() === trimmed);
  if (fromPromos) {
    if (!fromPromos.active) {
      return { valid: false, promo: null, message: "This promo code is inactive" };
    }
    if (fromPromos.startsAt && new Date(fromPromos.startsAt) > now) {
      return {
        valid: false,
        promo: null,
        message: `Promo starts ${new Date(fromPromos.startsAt).toLocaleDateString()}`,
      };
    }
    if (fromPromos.expiresAt && new Date(fromPromos.expiresAt) < now) {
      return { valid: false, promo: null, message: "This promo code has expired" };
    }
    if (fromPromos.minOrderAmount != null && subtotal < fromPromos.minOrderAmount) {
      return {
        valid: false,
        promo: null,
        message: `Minimum order not met for this code`,
      };
    }
    return {
      valid: true,
      promo: fromPromos,
      message: `${fromPromos.discountPercent}% discount applied`,
    };
  }

  if (settings?.promoCode && settings.promoCode.toUpperCase() === trimmed) {
    const sitePromo: PromoCode = {
      id: "site-default",
      code: settings.promoCode,
      discountPercent: settings.promoDiscount || 0,
      active: true,
      createdAt: "",
    };
    return {
      valid: true,
      promo: sitePromo,
      message: `${sitePromo.discountPercent}% discount applied`,
    };
  }

  return { valid: false, promo: null, message: "Invalid or expired promo code" };
}

export function calculateDiscount(subtotal: number, promo: PromoCode | null): number {
  if (!promo) return 0;
  return (subtotal * promo.discountPercent) / 100;
}
