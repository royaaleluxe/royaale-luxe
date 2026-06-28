import { NextResponse } from "next/server";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        {
          error:
            "Firebase Admin SDK not configured. Add serviceAccountKey.json to the project root or set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local.",
        },
        { status: 503 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const callerAdmin = await adminDb.collection("admins").doc(decoded.uid).get();
    if (!callerAdmin.exists) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = (await request.json()) as { uid?: string; disabled?: boolean };
    const { uid, disabled } = body;
    if (!uid || typeof disabled !== "boolean") {
      return NextResponse.json({ error: "uid and disabled are required" }, { status: 400 });
    }

    if (uid === decoded.uid && disabled) {
      return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 });
    }

    await adminDb.collection("users").doc(uid).set({ disabled }, { merge: true });

    try {
      await adminAuth.getUser(uid);
    } catch {
      return NextResponse.json(
        { error: "User exists in Firestore but has no Firebase Auth account." },
        { status: 404 }
      );
    }

    await adminAuth.updateUser(uid, { disabled });

    if (disabled) {
      await adminAuth.revokeRefreshTokens(uid);
    }

    return NextResponse.json({ success: true, authDisabled: disabled });
  } catch (error) {
    console.error("disable user error:", error);
    const message = error instanceof Error ? error.message : "Failed to update user status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
