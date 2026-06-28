import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function parseServiceAccountJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function loadServiceAccount(): Record<string, unknown> | null {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (fromEnv) {
    const parsed = parseServiceAccountJson(fromEnv);
    if (parsed) return parsed;
  }

  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const defaultPath = join(process.cwd(), "serviceAccountKey.json");
  const keyPath = configuredPath
    ? configuredPath.startsWith("/") || /^[A-Za-z]:/.test(configuredPath)
      ? configuredPath
      : join(process.cwd(), configuredPath)
    : defaultPath;

  if (!existsSync(keyPath)) return null;

  try {
    return JSON.parse(readFileSync(keyPath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;

  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return adminApp;
  }

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) return null;

  const projectId =
    (serviceAccount.project_id as string | undefined) ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  adminApp = initializeApp({
    credential: cert(serviceAccount),
    ...(projectId ? { projectId } : {}),
  });
  return adminApp;
}

export function getAdminAuth(): Auth | null {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function getAdminFirestore(): Firestore | null {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export function isAdminSdkConfigured(): boolean {
  return getAdminApp() !== null;
}
