import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";

const COOKIE_NAME = "admin_session";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(
        "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      )
    );
  }
  return jwks;
}

export interface VerifiedUser {
  uid: string;
  email?: string;
  payload: JWTPayload;
}

export async function verifyFirebaseToken(token: string): Promise<VerifiedUser | null> {
  if (!projectId || !token) return null;
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    const uid = payload.sub;
    if (!uid) return null;
    return {
      uid,
      email: typeof payload.email === "string" ? payload.email : undefined,
      payload,
    };
  } catch {
    return null;
  }
}

export async function verifyFirebaseTokenAdmin(token: string): Promise<VerifiedUser | null> {
  const adminAuth = getAdminAuth();
  if (!adminAuth) return verifyFirebaseToken(token);
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    return { uid: decoded.uid, email: decoded.email, payload: decoded as unknown as JWTPayload };
  } catch {
    return null;
  }
}

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim() || null;
}

export function extractAdminSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function verifyAdminRequest(request: Request): Promise<VerifiedUser | null> {
  const bearer = extractBearerToken(request);
  const cookieToken = extractAdminSessionToken(request);
  const token = bearer || cookieToken;
  if (!token) return null;

  const user = await verifyFirebaseTokenAdmin(token);
  if (!user) return null;

  const adminDb = getAdminFirestore();
  if (!adminDb) return null;

  const adminDoc = await adminDb.collection("admins").doc(user.uid).get();
  if (!adminDoc.exists) return null;

  return user;
}

export async function verifyCustomerRequest(request: Request): Promise<VerifiedUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const user = await verifyFirebaseTokenAdmin(token);
  if (!user) return null;

  const adminDb = getAdminFirestore();
  if (!adminDb) return user;

  const userDoc = await adminDb.collection("users").doc(user.uid).get();
  if (userDoc.exists && userDoc.data()?.disabled === true) return null;

  return user;
}

export { COOKIE_NAME };
