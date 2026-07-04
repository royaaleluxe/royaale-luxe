const DEFAULT_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const DEFAULT_HEADERS = "Content-Type, Authorization";

function configuredOrigins(): string[] {
  const origins = new Set<string>();

  for (const origin of (process.env.ALLOWED_ORIGINS ?? "").split(",")) {
    const trimmed = origin.trim();
    if (trimmed) origins.add(trimmed);
  }

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim().replace(/\/$/, "");
  if (adminUrl) origins.add(adminUrl);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl) origins.add(appUrl);

  return Array.from(origins);
}

function allowedOrigins(): string[] {
  return configuredOrigins();
}

export function resolveCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  const allowed = allowedOrigins();
  if (allowed.length === 0) return null;
  return allowed.includes(requestOrigin) ? requestOrigin : null;
}

export function corsHeaders(requestOrigin: string | null): Record<string, string> {
  const origin = resolveCorsOrigin(requestOrigin);
  if (!origin) return {};

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": DEFAULT_METHODS,
    "Access-Control-Allow-Headers": DEFAULT_HEADERS,
    Vary: "Origin",
  };
}

export function applyCorsHeaders(
  response: Response,
  requestOrigin: string | null
): Response {
  for (const [key, value] of Object.entries(corsHeaders(requestOrigin))) {
    response.headers.set(key, value);
  }
  return response;
}
