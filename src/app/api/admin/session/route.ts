import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/server/auth";
import { applyCorsHeaders } from "@/lib/server/cors";

const COOKIE_NAME = "admin_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function withCors(response: NextResponse, request: Request): NextResponse {
  return applyCorsHeaders(response, request.headers.get("origin")) as NextResponse;
}

function sessionCookieOptions() {
  const crossOrigin = Boolean(process.env.ALLOWED_ORIGINS?.trim() || process.env.NEXT_PUBLIC_ADMIN_URL?.trim());
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: crossOrigin ? ("none" as const) : ("strict" as const),
    maxAge: MAX_AGE,
    path: "/",
  };
}

export async function OPTIONS(request: Request) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: Request) {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminFirestore();
  if (!adminAuth || !adminDb) {
    return withCors(
      NextResponse.json({ isAdmin: false, error: "Admin SDK not configured" }, { status: 503 }),
      request
    );
  }

  const admin = await verifyAdminRequest(request);
  if (!admin) {
    return withCors(
      NextResponse.json({ isAdmin: false, error: "Not an admin" }, { status: 403 }),
      request
    );
  }
  return withCors(
    NextResponse.json({ isAdmin: true, uid: admin.uid, email: admin.email ?? null }),
    request
  );
}

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };
    if (!idToken) {
      return withCors(
        NextResponse.json({ error: "Missing idToken" }, { status: 400 }),
        request
      );
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();
    if (!adminAuth || !adminDb) {
      return withCors(
        NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 }),
        request
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
    if (!adminDoc.exists) {
      return withCors(
        NextResponse.json({ error: "Not an admin" }, { status: 403 }),
        request
      );
    }

    const response = NextResponse.json({
      success: true,
      uid: decoded.uid,
      email: decoded.email ?? null,
    });
    response.cookies.set(COOKIE_NAME, idToken, sessionCookieOptions());
    return withCors(response, request);
  } catch (error) {
    console.error("admin session error:", error);
    return withCors(
      NextResponse.json({ error: "Invalid token" }, { status: 401 }),
      request
    );
  }
}

export async function DELETE(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return withCors(response, request);
}
