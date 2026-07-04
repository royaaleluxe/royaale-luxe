import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyFirebaseTokenEdge } from "@/lib/server/edge-auth";
import { applyCorsHeaders, corsHeaders } from "@/lib/server/cors";
import { SECURITY_HEADERS } from "@/lib/server/security";

const COOKIE_NAME = "admin_session";
const IS_ADMIN_SITE = process.env.NEXT_PUBLIC_SITE_MODE === "admin";
const ADMIN_SITE_URL = process.env.NEXT_PUBLIC_ADMIN_URL?.trim().replace(/\/$/, "") ?? "";

function isStorefrontPath(pathname: string): boolean {
  return (
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/admin-portal") &&
    !pathname.startsWith("/_next")
  );
}

function withSecurityHeaders(
  response: NextResponse,
  requestOrigin: string | null,
  pathname?: string
): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (key === "Cross-Origin-Resource-Policy" && pathname?.startsWith("/api")) {
      response.headers.set(key, "cross-origin");
      continue;
    }
    response.headers.set(key, value);
  }
  for (const [key, value] of Object.entries(corsHeaders(requestOrigin))) {
    response.headers.set(key, value);
  }
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestOrigin = request.headers.get("origin");

  if (IS_ADMIN_SITE && isStorefrontPath(pathname)) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin-portal";
    return NextResponse.redirect(adminUrl);
  }

  if (!IS_ADMIN_SITE && ADMIN_SITE_URL && pathname.startsWith("/admin-portal")) {
    const externalAdmin = new URL("/admin-portal", `${ADMIN_SITE_URL}/`);
    externalAdmin.search = request.nextUrl.search;
    return NextResponse.redirect(externalAdmin);
  }

  if (pathname.startsWith("/api")) {
    if (request.method === "OPTIONS") {
      return withSecurityHeaders(new NextResponse(null, { status: 204 }), requestOrigin, pathname);
    }
  }

  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/session")) {
    const session = request.cookies.get(COOKIE_NAME)?.value;
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token = bearer || session;

    if (!token) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        requestOrigin,
        pathname
      );
    }

    const valid = await verifyFirebaseTokenEdge(token);
    if (!valid) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }),
        requestOrigin,
        pathname
      );
    }
  }

  const response = NextResponse.next();
  if (pathname.startsWith("/api")) {
    applyCorsHeaders(response, requestOrigin);
  }
  return withSecurityHeaders(response, requestOrigin, pathname);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
