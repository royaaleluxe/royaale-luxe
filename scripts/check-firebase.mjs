import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
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

async function main() {
  const env = loadEnv();
  const config = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = Object.entries(config).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error("Missing env vars:", missing.join(", "));
    process.exit(1);
  }

  console.log(`Checking Firebase connection for: ${config.projectId}`);

  const app = initializeApp(config);
  const db = getFirestore(app);

  try {
    const snap = await getDocs(collection(db, "products"));
    console.log(`✓ Firestore connected — ${snap.size} product(s) found`);
    console.log("✓ Backend is ready. Restart the dev server if it was already running.");
  } catch (err) {
    console.error("✗ Firestore connection failed:", err.message || err);
    if (err.code === "permission-denied") {
      console.error("  → Deploy firestore.rules or enable test mode in Firebase Console.");
    }
    process.exit(1);
  }

  const keyPath = env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? join(root, env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : join(root, "serviceAccountKey.json");
  const hasKeyFile = existsSync(keyPath);
  const hasKeyEnv = Boolean(env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());

  if (hasKeyFile || hasKeyEnv) {
    console.log("✓ Firebase Admin SDK credentials found (user disable/sign-in blocking enabled)");
  } else {
    console.warn("⚠ No Firebase Admin SDK credentials found.");
    console.warn("  Disable user will NOT block sign-in until you add one of:");
    console.warn("  • serviceAccountKey.json in the project root");
    console.warn("  • FIREBASE_SERVICE_ACCOUNT_JSON in .env.local");
    console.warn("  Download from Firebase Console → Project Settings → Service accounts → Generate new private key");
  }
}

main();
