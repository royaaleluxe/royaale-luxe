# Royaale Luxe

Ultra-luxurious e-commerce platform for a Saint Lucia-based premium clothing brand.

## Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS v3, Framer Motion, Lucide React
- **Backend:** Firebase (Firestore, Auth, Storage)

## Getting Started

1. **Install dependencies**

```bash
npm install
```

2. **Create a Firebase project**

   1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project** → name it (e.g. `royaale-luxe`)
   2. **Build → Firestore Database** → Create database → start in **test mode** (you'll deploy rules later)
   3. **Build → Authentication** → Sign-in method → enable **Email/Password**
   4. **Project Settings → Your apps** → Add **Web app** → copy the `firebaseConfig` values

   **Storage (optional)** — Firebase Storage requires upgrading to the **Blaze (pay-as-you-go)** plan. The free tier includes 5 GB storage and 1 GB/day downloads, so a small shop typically pays nothing. If you skip Storage for now, checkout still works: receipts are saved directly in Firestore (images under 800 KB), and product images can be added via URL in the admin portal.

3. **Configure environment**

Copy `.env.example` to `.env.local` (or edit the existing `.env.local`) and paste your Firebase web config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

4. **Seed Firestore & verify connection**

For seeding, download a **service account key** (Firebase Console → Project Settings → Service accounts → Generate new private key) and save it as `serviceAccountKey.json` in the project root. This file is gitignored.

```bash
npm run firebase:seed    # loads demo products, district fees, and site settings
npm run firebase:check   # confirms Firestore is reachable
```

5. **Deploy security rules**

In Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`.  
If you enabled Storage (Blaze plan), also paste `storage.rules` under Storage → Rules.

6. **Set up Firestore collections**

Create these collections in Firestore:

| Collection | Purpose |
|---|---|
| `products` | Product catalog with variant stock matrix |
| `orders` | Customer orders with receipt URLs |
| `users` | User profiles, wishlists, notifications |
| `admins` | Admin UIDs (document ID = user UID) |
| `districtFees` | Per-district delivery pricing |
| `settings/site` | Hero slides, promo codes, flash sale |
| `newsletter` | Email subscribers |

7. **Create an admin user**

- Enable Email/Password auth in Firebase Console
- Sign up through the storefront
- Add a document in `admins` collection with the user's UID as document ID:

```json
{ "uid": "USER_UID", "email": "admin@example.com", "role": "admin" }
```

8. **Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- Floating glassmorphic header with search, cart, wishlist, notifications
- Real-time product catalog with size/color variants
- Saint Lucia district-based delivery (no postal codes)
- Bank transfer checkout with receipt upload
- Full admin portal at `/admin-portal`
