import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
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
    ? (configuredPath.startsWith("/") || /^[A-Za-z]:/.test(configuredPath)
        ? configuredPath
        : join(root, configuredPath))
    : defaultPath;

  if (!existsSync(keyPath)) {
    console.error("Missing Firebase service account key for seeding.");
    console.error("");
    console.error("Firestore security rules only allow admins to write data.");
    console.error("The seed script uses the Admin SDK, which bypasses those rules.");
    console.error("");
    console.error("1. Firebase Console → Project Settings → Service accounts");
    console.error("2. Generate new private key → save the JSON file");
    console.error(`3. Save it as: ${defaultPath}`);
    console.error("   Or set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local");
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const SAINT_LUCIA_DISTRICTS = [
  "Castries", "Gros Islet", "Soufrière", "Vieux Fort", "Choiseul",
  "Laborie", "Micoud", "Dennery", "Anse la Raye", "Canaries",
];

const products = [
  {
    id: "cap-estate-silk-midi",
    title: "Cap Estate Silk Midi",
    description: "Flowing silk midi dress inspired by Marigot Bay sunsets.",
    images: ["https://images.unsplash.com/photo-1595777457583-95e0599d2c4f?w=800&q=80"],
    altImages: ["https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80"],
    price: 289,
    originalPrice: 349,
    category: "Dresses",
    featured: true,
    newArrival: true,
    variants: [
      {
        color: "Blush",
        colorHex: "#FFD1DC",
        size: "S",
        quantity: 8,
        image: "https://images.unsplash.com/photo-1595777457583-95e0599d2c4f?w=800&q=80",
      },
      {
        color: "Blush",
        colorHex: "#FFD1DC",
        size: "M",
        quantity: 5,
        image: "https://images.unsplash.com/photo-1595777457583-95e0599d2c4f?w=800&q=80",
      },
      {
        color: "Blush",
        colorHex: "#FFD1DC",
        size: "L",
        quantity: 3,
        image: "https://images.unsplash.com/photo-1595777457583-95e0599d2c4f?w=800&q=80",
      },
      {
        color: "Ivory",
        colorHex: "#FFFFF0",
        size: "M",
        quantity: 6,
        image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80",
      },
      {
        color: "Ivory",
        colorHex: "#FFFFF0",
        size: "L",
        quantity: 2,
        image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&q=80",
      },
    ],
  },
  {
    id: "rodney-bay-linen-set",
    title: "Rodney Bay Linen Set",
    description: "Breathable linen co-ord for island evenings.",
    images: ["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=800&q=80"],
    price: 195,
    category: "Sets",
    bestseller: true,
    variants: [
      { color: "Sand", colorHex: "#C2B280", size: "S", quantity: 10 },
      { color: "Sand", colorHex: "#C2B280", size: "M", quantity: 7 },
      { color: "Sand", colorHex: "#C2B280", size: "L", quantity: 4 },
      { color: "White", colorHex: "#FFFFFF", size: "M", quantity: 0 },
    ],
  },
  {
    id: "soufriere-evening-gown",
    title: "Soufrière Evening Gown",
    description: "Dramatic floor-length gown with hand-finished details.",
    images: ["https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80"],
    price: 425,
    originalPrice: 499,
    category: "Evening",
    featured: true,
    variants: [
      { color: "Onyx", colorHex: "#1A1A1A", size: "S", quantity: 2 },
      { color: "Onyx", colorHex: "#1A1A1A", size: "M", quantity: 1 },
      { color: "Ruby", colorHex: "#9B1B30", size: "L", quantity: 3 },
    ],
  },
  {
    id: "gros-islet-resort-shirt",
    title: "Gros Islet Resort Shirt",
    description: "Relaxed-fit premium cotton shirt with subtle monogram.",
    images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b56?w=800&q=80"],
    price: 128,
    category: "Tops",
    newArrival: true,
    variants: [
      { color: "Sky", colorHex: "#87CEEB", size: "M", quantity: 12 },
      { color: "Sky", colorHex: "#87CEEB", size: "L", quantity: 9 },
      { color: "Sky", colorHex: "#87CEEB", size: "XL", quantity: 5 },
    ],
  },
];

const siteSettings = {
  heroSlides: [
    {
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=80",
      title: "Island Elegance",
      subtitle: "Curated luxury for the discerning Saint Lucian wardrobe",
      cta: "Shop New Arrivals",
      link: "/new-arrivals",
    },
    {
      image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1600&q=80",
      title: "Flash Drop",
      subtitle: "Limited pieces. Infinite style.",
      cta: "Shop Bestsellers",
      link: "/bestsellers",
    },
  ],
  flashSaleActive: true,
  flashSaleEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  promoCode: "LUXE10",
  promoDiscount: 10,
  heroText: "Where Caribbean soul meets couture refinement.",
};

async function main() {
  const app = initAdmin();
  const db = getFirestore(app);

  console.log(`Seeding Firestore for project: ${app.options.projectId}`);

  for (const product of products) {
    const { id, ...data } = product;
    await db.collection("products").doc(id).set({ ...data, createdAt: new Date().toISOString() });
    console.log(`  ✓ product: ${product.title}`);
  }

  for (let i = 0; i < SAINT_LUCIA_DISTRICTS.length; i++) {
    const district = SAINT_LUCIA_DISTRICTS[i];
    const fee = { district, fee: 15 + i * 2, active: true };
    const docId = district.replace(/\s/g, "-").toLowerCase();
    await db.collection("districtFees").doc(docId).set(fee);
    console.log(`  ✓ district fee: ${district}`);
  }

  await db.collection("settings").doc("site").set(siteSettings);
  console.log("  ✓ site settings");

  const snap = await db.collection("products").get();
  console.log(`\nDone. ${snap.size} products in Firestore.`);
  console.log("\nNext steps:");
  console.log("  1. Enable Email/Password auth in Firebase Console");
  console.log("  2. Sign up on the storefront, then add your UID to the admins collection");
}

main().catch((err) => {
  console.error("Seed failed:", err.message || err);
  process.exit(1);
});
