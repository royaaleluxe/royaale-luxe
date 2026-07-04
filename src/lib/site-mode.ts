export type SiteMode = "storefront" | "admin";

export function getSiteMode(): SiteMode {
  return process.env.NEXT_PUBLIC_SITE_MODE === "admin" ? "admin" : "storefront";
}

export function isAdminSite(): boolean {
  return getSiteMode() === "admin";
}

export function isStorefrontSite(): boolean {
  return !isAdminSite();
}
