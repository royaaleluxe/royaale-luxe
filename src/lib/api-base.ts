/** Base URL for server API routes (empty = same origin, e.g. local dev). */
export function getApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
