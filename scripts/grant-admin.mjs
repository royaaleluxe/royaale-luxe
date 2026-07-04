import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function initAdmin() {
  if (getApps().length) return getApps()[0];

  const env = loadEnv();
  const configuredPath = env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const defaultPath = join(root, "serviceAccountKey.json");
  const keyPath = configuredPath
    ? configuredPath.startsWith("/") || /^[A-Za-z]:/.test(configuredPath)
      ? configuredPath
      : join(root, configuredPath)
    : defaultPath;

  if (!existsSync(keyPath)) {
    console.error("Missing Firebase service account key.");
    console.error(`Expected: ${defaultPath}`);
    console.error("Or set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  return initializeApp({ credential: cert(serviceAccount) });
}

async function resolveUid(input) {
  if (input.includes("@")) {
    const auth = getAuth();
    const user = await auth.getUserByEmail(input.trim().toLowerCase());
    return { uid: user.uid, email: user.email ?? input };
  }
  return { uid: input.trim(), email: null };
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npm run firebase:grant-admin -- <email-or-uid>");
    console.error("Example: npm run firebase:grant-admin -- you@example.com");
    process.exit(1);
  }

  initAdmin();
  const auth = getAuth();
  const db = getFirestore();

  const { uid, email } = await resolveUid(input);
  const resolvedEmail = email ?? (await auth.getUser(uid)).email ?? "";

  const ref = db.collection("admins").doc(uid);
  const existing = await ref.get();
  if (existing.exists) {
    console.log(`Already an admin: ${resolvedEmail || uid} (${uid})`);
    return;
  }

  await ref.set({
    uid,
    email: resolvedEmail,
    role: "admin",
    addedAt: new Date().toISOString(),
  });

  console.log(`Granted admin access to ${resolvedEmail || uid}`);
  console.log(`UID: ${uid}`);
  console.log("Sign in again at /admin-portal.");
}

main().catch((err) => {
  console.error("Failed:", err.message || err);
  process.exit(1);
});
