import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";
import { verifyAdminRequest } from "@/lib/server/auth";

const COOKIE_NAME = "admin_session";
const MAX_AGE = 60 * 60 * 12; // 12 hours

function sessionCookieOptions() {
  const crossOrigin = Boolean(process.env.ALLOWED_ORIGINS?.trim());
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: crossOrigin ? ("none" as const) : ("strict" as const),
    maxAge: MAX_AGE,
    path: "/",
  };
}

export async function GET(request: Request) {
  const admin = await verifyAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ isAdmin: false, error: "Not an admin" }, { status: 403 });
  }
  return NextResponse.json({ isAdmin: true, uid: admin.uid, email: admin.email ?? null });
}

export async function POST(request: Request) {
  try {
    const { idToken } = (await request.json()) as { idToken?: string };
    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();
    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: "Admin SDK not configured" }, { status: 503 });
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Not an admin" }, { status: 403 });
    }

    const response = NextResponse.json({
      success: true,
      uid: decoded.uid,
      email: decoded.email ?? null,
    });
    response.cookies.set(COOKIE_NAME, idToken, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error("admin session error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
