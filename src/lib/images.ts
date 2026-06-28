import { IMAGE_HOSTS } from "../../image-hosts.mjs";

const ALLOWED_HOSTS = new Set<string>(IMAGE_HOSTS);

/** Extract a direct image URL from pasted search-engine / redirect links. */
export function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  try {
    const parsed = new URL(trimmed);

    if (parsed.hostname.endsWith("google.com") && parsed.pathname.includes("/imgres")) {
      const imgurl = parsed.searchParams.get("imgurl");
      if (imgurl) return decodeURIComponent(imgurl);
    }

    if (parsed.hostname === "www.bing.com" && parsed.pathname.includes("/images/search")) {
      const mediaurl = parsed.searchParams.get("mediaurl");
      if (mediaurl) return decodeURIComponent(mediaurl);
    }

    return trimmed;
  } catch {
    return trimmed;
  }
}

export function getImageHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function isConfiguredImageHost(url: string): boolean {
  const host = getImageHostname(url);
  return host !== null && ALLOWED_HOSTS.has(host);
}

export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
