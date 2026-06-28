import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyFirebaseTokenEdge } from "@/lib/server/edge-auth";
import { SECURITY_HEADERS } from "@/lib/server/security";

const COOKIE_NAME = "admin_session";

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
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

  if (pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/session")) {
    const session = request.cookies.get(COOKIE_NAME)?.value;
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const token = bearer || session;

    if (!token) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const valid = await verifyFirebaseTokenEdge(token);
    if (!valid) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
      );
    }
  }

  const response = NextResponse.next();
  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
