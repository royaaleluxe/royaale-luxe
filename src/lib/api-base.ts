/** Resolved API base URL (empty = same origin). */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ?? "";
}

/** Full URL for a server API route. */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
