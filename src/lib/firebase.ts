import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getOrInitApp(name?: string): FirebaseApp | null {
  if (typeof window === "undefined") return null;
  if (!isConfigured()) return null;

  const appName = name ?? "[DEFAULT]";
  const existing = getApps().find((app) => app.name === appName);
  if (existing) return existing;

  return name ? initializeApp(firebaseConfig, name) : initializeApp(firebaseConfig);
}

/** Storefront: auth + Firestore on the same app so security rules see the signed-in user. */
const storefrontApp = getOrInitApp();

/** Admin portal: separate app instance for an independent browser session. */
const adminApp = getOrInitApp("admin");

export const db: Firestore | null = storefrontApp ? getFirestore(storefrontApp) : null;
export const storage: FirebaseStorage | null = storefrontApp ? getStorage(storefrontApp) : null;

/** Customer storefront session — separate from admin portal auth. */
export const storefrontAuth: Auth | null = storefrontApp ? getAuth(storefrontApp) : null;

/** Admin portal session — must use adminDb (not db) so Firestore rules receive this auth token. */
export const adminAuth: Auth | null = adminApp ? getAuth(adminApp) : null;
export const adminDb: Firestore | null = adminApp ? getFirestore(adminApp) : null;

/** @deprecated Use storefrontAuth or adminAuth explicitly. */
export const auth = storefrontAuth;
