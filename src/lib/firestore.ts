import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db as storefrontDb } from "./firebase";
import { getApiUrl } from "./api-base";
import type { Firestore } from "firebase/firestore";
import { normalizeImageUrl } from "./images";
import type {
  Product,
  Order,
  DistrictFee,
  SiteSettings,
  UserProfile,
  AdminUser,
  PromoCode,
  CartItem,
  SavedAddress,
  BackInStockAlert,
  AdminAlert,
} from "./types";
import type { ProductSize } from "./constants";
import { SAINT_LUCIA_DISTRICTS } from "./constants";
import { buildVariantRestores, buildVariantUpdates, type StockValidationError } from "./orders";
import { getStockForVariant } from "./products";

/** Active Firestore instance — storefront by default; admin portal binds adminDb on mount. */
let db: Firestore | null = storefrontDb;

export function bindFirestore(instance: Firestore | null) {
  db = instance ?? storefrontDb;
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    title: product.title ?? "",
    description: product.description ?? "",
    category: product.category ?? "General",
    price: product.price ?? 0,
    images: (product.images ?? []).map(normalizeImageUrl),
    altImages: product.altImages?.map(normalizeImageUrl),
    variants: (product.variants ?? []).map((v) => ({
      ...v,
      image: v.image ? normalizeImageUrl(v.image) : undefined,
    })),
  };
}

export async function fetchProducts(): Promise<Product[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "products"));
    return snap.docs.map((d) => normalizeProduct({ id: d.id, ...d.data() } as Product));
  } catch {
    return [];
  }
}

export function subscribeProducts(callback: (products: Product[]) => void): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, "products"),
    (snap) => callback(snap.docs.map((d) => normalizeProduct({ id: d.id, ...d.data() } as Product))),
    (err) => {
      console.error("products subscription error:", err);
      callback([]);
    }
  );
}

export async function fetchProductById(
  id: string,
  firestore: Firestore | null = db
): Promise<Product | null> {
  if (!firestore) return null;
  try {
    const snap = await getDoc(doc(firestore, "products", id));
    if (!snap.exists()) return null;
    return normalizeProduct({ id: snap.id, ...snap.data() } as Product);
  } catch {
    return null;
  }
}

export async function fetchProductsByIds(
  ids: string[],
  firestore: Firestore | null = db
): Promise<Product[]> {
  if (!firestore || ids.length === 0) return [];
  const uniqueIds = Array.from(new Set(ids));
  const products = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const snap = await getDoc(doc(firestore, "products", id));
        if (!snap.exists()) return null;
        return normalizeProduct({ id: snap.id, ...snap.data() } as Product);
      } catch {
        return null;
      }
    })
  );
  return products.filter((p): p is Product => p !== null);
}

function stripUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as T;
}

export async function saveProduct(product: Product): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  const { id, ...data } = product;
  const payload = stripUndefined({
    ...data,
    images: (data.images ?? []).map(normalizeImageUrl),
    altImages: data.altImages?.map(normalizeImageUrl),
    variants: (data.variants ?? []).map((v) => ({
      ...v,
      image: v.image ? normalizeImageUrl(v.image) : undefined,
    })),
    createdAt: data.createdAt || new Date().toISOString(),
  });
  if (id) {
    await setDoc(doc(db, "products", id), payload, { merge: true });
  } else {
    await addDoc(collection(db, "products"), payload);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await deleteDoc(doc(db, "products", id));
}

export async function fetchOrders(): Promise<Order[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, "orders"), orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
  } catch {
    return [];
  }
}

export function subscribeOrders(callback: (orders: Order[]) => void): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc")),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))),
    (err) => {
      console.error("orders subscription error:", err);
      callback([]);
    }
  );
}

export async function validateCartStock(items: CartItem[]): Promise<StockValidationError[]> {
  if (!db) return [];
  const errors: StockValidationError[] = [];
  for (const item of items) {
    const snap = await getDoc(doc(db, "products", item.productId));
    if (!snap.exists()) {
      errors.push({
        productId: item.productId,
        title: item.title,
        color: item.color,
        size: item.size,
        requested: item.quantity,
        available: 0,
      });
      continue;
    }
    const product = normalizeProduct({ id: snap.id, ...snap.data() } as Product);
    const available = getStockForVariant(product, item.color, item.size as ProductSize);
    if (available < item.quantity) {
      errors.push({
        productId: item.productId,
        title: item.title,
        color: item.color,
        size: item.size,
        requested: item.quantity,
        available,
      });
    }
  }
  return errors;
}

/** Creates order and decrements inventory atomically. */
export async function createOrderWithInventory(order: Omit<Order, "id">): Promise<string> {
  if (!db) throw new Error("Firebase not configured");

  const stockErrors = await validateCartStock(order.items);
  if (stockErrors.length > 0) {
    const first = stockErrors[0];
    throw new Error(
      first.available <= 0
        ? `${first.title} (${first.color}/${first.size}) is sold out`
        : `Only ${first.available} left for ${first.title} (${first.color}/${first.size})`
    );
  }

  return runTransaction(db, async (transaction) => {
    const productMap = new Map<string, Product>();
    const productRefs = order.items.map((item) => doc(db!, "products", item.productId));

    for (const ref of productRefs) {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("A product in your cart is no longer available");
      productMap.set(
        snap.id,
        normalizeProduct({ id: snap.id, ...snap.data() } as Product)
      );
    }

    const updates = buildVariantUpdates(order.items, productMap);
    for (const { productId, variants } of updates) {
      transaction.update(doc(db!, "products", productId), { variants });
    }

    const orderRef = doc(collection(db!, "orders"));
    transaction.set(orderRef, stripUndefined(order));
    return orderRef.id;
  });
}

export async function fetchOrderById(
  firestoreId: string,
  firestore: Firestore | null = db
): Promise<Order | null> {
  if (!firestore) return null;
  try {
    const snap = await getDoc(doc(firestore, "orders", firestoreId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Order;
  } catch {
    return null;
  }
}

export async function updateOrderInternalNotes(
  firestoreId: string,
  internalNotes: string
): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await updateDoc(doc(db, "orders", firestoreId), { internalNotes });
}

export async function bulkUpdateOrderStatus(
  orders: Pick<Order, "id" | "orderId" | "userId" | "status" | "delivery">[],
  status: Order["status"]
): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  const batch = writeBatch(db);

  for (const order of orders) {
    batch.update(doc(db, "orders", order.id), { status });
  }
  await batch.commit();

  for (const order of orders) {
    if (order.status === status) continue;
    const message = `Order #${order.orderId} has been updated to "${status}"${
      status === "Out for Delivery" ? ` — heading to ${order.delivery.district}` : ""
    }!`;
    await pushUserNotification(order.userId, message);
  }
}

async function pushUserNotification(userId: string, message: string): Promise<void> {
  if (!db) return;
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;
  const data = userSnap.data() as UserProfile;
  const notifications = data.notifications || [];
  notifications.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  });
  await updateDoc(userRef, { notifications: notifications.slice(0, 50) });
}

export async function createAdminAlert(alert: Omit<AdminAlert, "id">): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await addDoc(collection(db, "adminAlerts"), stripUndefined(alert));
}

export function subscribeAdminAlerts(callback: (alerts: AdminAlert[]) => void): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(db, "adminAlerts"), orderBy("createdAt", "desc")),
    (snap) =>
      callback(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminAlert)).slice(0, 50)
      ),
    (err) => {
      console.error("adminAlerts subscription error:", err);
      callback([]);
    }
  );
}

export async function markAdminAlertsRead(ids: string[]): Promise<void> {
  if (!db || ids.length === 0) return;
  const batch = writeBatch(db);
  for (const id of ids) {
    batch.update(doc(db, "adminAlerts", id), { read: true });
  }
  await batch.commit();
}

export async function syncUserCart(uid: string, items: CartItem[]): Promise<void> {
  if (!db) return;
  await updateDoc(doc(db, "users", uid), { savedCart: items });
}

export async function saveUserAddresses(uid: string, addresses: SavedAddress[]): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await updateDoc(doc(db, "users", uid), { savedAddresses: addresses });
}

export async function addBackInStockAlert(
  uid: string,
  alert: Omit<BackInStockAlert, "createdAt">
): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  const profile = await getUserProfile(uid);
  const existing = profile?.backInStockAlerts || [];
  const key = `${alert.productId}-${alert.color}-${alert.size}`;
  if (existing.some((a) => `${a.productId}-${a.color}-${a.size}` === key)) return;
  const next: BackInStockAlert[] = [
    { ...alert, createdAt: new Date().toISOString() },
    ...existing,
  ];
  await updateDoc(doc(db, "users", uid), { backInStockAlerts: next });
}

export async function removeBackInStockAlert(
  uid: string,
  productId: string,
  color: string,
  size: ProductSize
): Promise<void> {
  if (!db) return;
  const profile = await getUserProfile(uid);
  if (!profile?.backInStockAlerts?.length) return;
  const next = profile.backInStockAlerts.filter(
    (a) => !(a.productId === productId && a.color === color && a.size === size)
  );
  await updateDoc(doc(db, "users", uid), { backInStockAlerts: next });
}

export async function processBackInStockAlerts(
  uid: string,
  products: Product[]
): Promise<number> {
  if (!db) return 0;
  const profile = await getUserProfile(uid);
  if (!profile?.backInStockAlerts?.length) return 0;

  let notified = 0;
  const remaining: BackInStockAlert[] = [];

  for (const alert of profile.backInStockAlerts) {
    const product = products.find((p) => p.id === alert.productId);
    const stock = product
      ? getStockForVariant(product, alert.color, alert.size)
      : 0;
    if (stock > 0 && product) {
      await pushUserNotification(
        uid,
        `${product.title} (${alert.color}/${alert.size}) is back in stock!`
      );
      notified++;
    } else {
      remaining.push(alert);
    }
  }

  if (notified > 0) {
    await updateDoc(doc(db, "users", uid), { backInStockAlerts: remaining });
  }
  return notified;
}

export async function updateOrderStatus(
  orderId: string,
  firestoreId: string,
  status: Order["status"],
  userId: string,
  message: string,
  previousStatus?: Order["status"]
): Promise<void> {
  if (!db) throw new Error("Firebase not configured");

  const orderSnap = await getDoc(doc(db, "orders", firestoreId));
  if (!orderSnap.exists()) throw new Error("Order not found");
  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;
  const priorStatus = previousStatus ?? order.status;

  if (status === "Cancelled" && priorStatus !== "Cancelled") {
    await runTransaction(db, async (transaction) => {
      const productMap = new Map<string, Product>();
      for (const item of order.items) {
        const ref = doc(db!, "products", item.productId);
        const snap = await transaction.get(ref);
        if (snap.exists()) {
          productMap.set(
            snap.id,
            normalizeProduct({ id: snap.id, ...snap.data() } as Product)
          );
        }
      }
      const restores = buildVariantRestores(order.items, productMap);
      for (const { productId, variants } of restores) {
        transaction.update(doc(db!, "products", productId), { variants });
      }
      transaction.update(doc(db!, "orders", firestoreId), { status });
    });
  } else {
    await updateDoc(doc(db, "orders", firestoreId), { status });
  }

  await pushUserNotification(userId, message);
}

export async function fetchDistrictFees(): Promise<DistrictFee[]> {
  if (!db) return getDefaultDistrictFees();
  try {
    const snap = await getDocs(collection(db, "districtFees"));
    if (snap.empty) return getDefaultDistrictFees();
    return snap.docs.map((d) => d.data() as DistrictFee);
  } catch {
    return getDefaultDistrictFees();
  }
}

export function subscribeDistrictFees(callback: (fees: DistrictFee[]) => void): Unsubscribe {
  if (!db) {
    callback(getDefaultDistrictFees());
    return () => {};
  }
  return onSnapshot(
    collection(db, "districtFees"),
    (snap) => {
      if (snap.empty) callback(getDefaultDistrictFees());
      else callback(snap.docs.map((d) => d.data() as DistrictFee));
    },
    (err) => {
      console.error("districtFees subscription error:", err);
      callback(getDefaultDistrictFees());
    }
  );
}

export async function saveDistrictFee(fee: DistrictFee): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await setDoc(doc(db, "districtFees", fee.district.replace(/\s/g, "-").toLowerCase()), fee);
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  if (!db) return getDefaultSettings();
  try {
    const snap = await getDoc(doc(db, "settings", "site"));
    if (!snap.exists()) return getDefaultSettings();
    const data = snap.data() as SiteSettings;
    return {
      ...getDefaultSettings(),
      ...data,
      deliveryDays: data.deliveryDays?.length ? data.deliveryDays : getDefaultSettings().deliveryDays,
    };
  } catch {
    return getDefaultSettings();
  }
}

export function subscribeSiteSettings(callback: (settings: SiteSettings) => void): Unsubscribe {
  if (!db) {
    callback(getDefaultSettings());
    return () => {};
  }
  return onSnapshot(
    doc(db, "settings", "site"),
    (snap) => {
      callback(
        snap.exists()
          ? {
              ...getDefaultSettings(),
              ...(snap.data() as SiteSettings),
              deliveryDays:
                (snap.data() as SiteSettings).deliveryDays?.length
                  ? (snap.data() as SiteSettings).deliveryDays
                  : getDefaultSettings().deliveryDays,
            }
          : getDefaultSettings()
      );
    },
    (err) => {
      console.error("settings subscription error:", err);
      callback(getDefaultSettings());
    }
  );
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await setDoc(doc(db, "settings", "site"), settings, { merge: true });
}

export async function subscribeNewsletter(email: string): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await addDoc(collection(db, "newsletter"), { email, subscribedAt: new Date().toISOString() });
}

export async function isAdmin(uid: string): Promise<boolean> {
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, "admins", uid));
    return snap.exists();
  } catch {
    return false;
  }
}

function normalizeUserProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    firstName: (data.firstName as string) ?? "",
    lastName: (data.lastName as string) ?? "",
    email: (data.email as string) ?? "",
    phoneNumber: (data.phoneNumber as string) ?? "",
    savedWishlist: (data.savedWishlist as string[]) ?? [],
    savedCart: (data.savedCart as CartItem[]) ?? [],
    savedAddresses: (data.savedAddresses as SavedAddress[]) ?? [],
    backInStockAlerts: (data.backInStockAlerts as BackInStockAlert[]) ?? [],
    orderHistory: (data.orderHistory as string[]) ?? [],
    notifications: (data.notifications as UserProfile["notifications"]) ?? [],
    disabled: data.disabled === true,
    adminNotes: data.adminNotes as string | undefined,
  };
}

export async function getUserProfile(
  uid: string,
  firestore: Firestore | null = db
): Promise<UserProfile | null> {
  if (!firestore) return null;
  try {
    const snap = await getDoc(doc(firestore, "users", uid));
    if (!snap.exists()) return null;
    return normalizeUserProfile(snap.id, snap.data());
  } catch {
    return null;
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await setDoc(doc(db, "users", profile.uid), profile);
}

export async function ensureUserProfile(
  uid: string,
  defaults: Pick<UserProfile, "email" | "firstName" | "lastName" | "phoneNumber">,
  firestore: Firestore | null = db
): Promise<UserProfile> {
  if (!firestore) throw new Error("Firebase not configured");
  const ref = doc(firestore, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserProfile;
  const profile: UserProfile = {
    uid,
    firstName: defaults.firstName,
    lastName: defaults.lastName,
    email: defaults.email,
    phoneNumber: defaults.phoneNumber,
    savedWishlist: [],
    savedCart: [],
    savedAddresses: [],
    backInStockAlerts: [],
    orderHistory: [],
    notifications: [],
  };
  await setDoc(ref, profile);
  return profile;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>,
  firestore: Firestore | null = db
): Promise<void> {
  if (!firestore) throw new Error("Firebase not configured");
  const ref = doc(firestore, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, data);
  } else {
    await setDoc(ref, { uid, savedWishlist: [], orderHistory: [], notifications: [], ...data }, { merge: true });
  }
}

export async function fetchOrdersForUser(
  userId: string,
  firestore: Firestore | null = db
): Promise<Order[]> {
  if (!firestore) return [];
  try {
    const snap = await getDocs(query(collection(firestore, "orders"), where("userId", "==", userId)));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Order))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export function subscribeUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  firestore: Firestore | null = db
): Unsubscribe {
  if (!firestore) {
    callback(null);
    return () => {};
  }
  return onSnapshot(
    doc(firestore, "users", uid),
    (snap) => {
      callback(snap.exists() ? normalizeUserProfile(snap.id, snap.data()) : null);
    },
    (err) => {
      console.error("user profile subscription error:", err);
      callback(null);
    }
  );
}

export function subscribeIsAdmin(
  uid: string,
  callback: (isAdmin: boolean) => void,
  firestore: Firestore | null = db
): Unsubscribe {
  if (!firestore) {
    callback(false);
    return () => {};
  }

  const ref = doc(firestore, "admins", uid);

  const readOnce = () => {
    getDoc(ref)
      .then((snap) => callback(snap.exists()))
      .catch((err) => {
        console.error("admin status lookup error:", err);
        callback(false);
      });
  };

  return onSnapshot(
    ref,
    (snap) => callback(snap.exists()),
    (err) => {
      console.error("admin status subscription error:", err);
      readOnce();
    }
  );
}

export async function markNotificationsRead(uid: string): Promise<void> {
  if (!db) return;
  const profile = await getUserProfile(uid);
  if (!profile) return;
  const notifications = (profile.notifications || []).map((n) => ({ ...n, read: true }));
  await updateDoc(doc(db, "users", uid), { notifications });
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => normalizeUserProfile(d.id, d.data()));
  } catch {
    return [];
  }
}

export function subscribeUsers(
  callback: (users: UserProfile[]) => void,
  firestore: Firestore | null = db
): Unsubscribe {
  if (!firestore) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(firestore, "users"),
    (snap) => {
      callback(snap.docs.map((d) => normalizeUserProfile(d.id, d.data())));
    },
    (err) => {
      console.error("users subscription error:", err);
      callback([]);
    }
  );
}

export async function fetchAdmins(): Promise<AdminUser[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "admins"));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AdminUser));
  } catch {
    return [];
  }
}

export function subscribeAdmins(
  callback: (admins: AdminUser[]) => void,
  firestore: Firestore | null = db
): Unsubscribe {
  if (!firestore) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(firestore, "admins"),
    (snap) => {
      callback(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as AdminUser)));
    },
    (err) => {
      console.error("admins subscription error:", err);
      callback([]);
    }
  );
}

export async function grantAdminAccess(
  uid: string,
  email: string,
  firestore: Firestore | null = db
): Promise<void> {
  if (!firestore) throw new Error("Firebase not configured");
  await setDoc(doc(firestore, "admins", uid), {
    uid,
    email,
    role: "admin",
    addedAt: new Date().toISOString(),
  });
}

export async function revokeAdminAccess(uid: string, firestore: Firestore | null = db): Promise<void> {
  if (!firestore) throw new Error("Firebase not configured");
  await deleteDoc(doc(firestore, "admins", uid));
}

export async function setUserDisabled(
  uid: string,
  disabled: boolean,
  _firestore: Firestore | null = db,
  idToken?: string | null
): Promise<void> {
  if (!idToken) {
    throw new Error("Admin session expired. Sign in again.");
  }

  const res = await fetch(getApiUrl("/api/admin/users/disable"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ uid, disabled }),
  });

  const data = (await res.json().catch(() => ({}))) as { error?: string };

  if (!res.ok) {
    if (res.status === 503) {
      throw new Error(
        data.error ||
          "Firebase Admin SDK not configured. Add serviceAccountKey.json or FIREBASE_SERVICE_ACCOUNT_JSON to block sign-in."
      );
    }
    throw new Error(data.error || "Failed to update user status");
  }
}

export async function fetchPromos(): Promise<PromoCode[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "promos"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PromoCode));
  } catch {
    return [];
  }
}

export function subscribePromos(callback: (promos: PromoCode[]) => void): Unsubscribe {
  if (!db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(
    collection(db, "promos"),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PromoCode))),
    (err) => {
      console.error("promos subscription error:", err);
      callback([]);
    }
  );
}

export async function savePromo(promo: PromoCode): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  const { id, ...data } = promo;
  const payload = stripUndefined({
    ...data,
    code: data.code.toUpperCase(),
    createdAt: data.createdAt || new Date().toISOString(),
  });
  if (id) {
    await setDoc(doc(db, "promos", id), payload, { merge: true });
  } else {
    await addDoc(collection(db, "promos"), payload);
  }
}

export async function deletePromo(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not configured");
  await deleteDoc(doc(db, "promos", id));
}

function getDefaultDistrictFees(): DistrictFee[] {
  return SAINT_LUCIA_DISTRICTS.map((district, i) => ({
    district,
    fee: 15 + i * 2,
    active: true,
    minDays: 2,
    maxDays: 5,
  }));
}

export const DEFAULT_DELIVERY_DAYS = [
  { id: "mon", label: "Monday", active: true },
  { id: "tue", label: "Tuesday", active: true },
  { id: "wed", label: "Wednesday", active: true },
  { id: "thu", label: "Thursday", active: true },
  { id: "fri", label: "Friday", active: true },
  { id: "sat", label: "Saturday", active: true },
  { id: "sun", label: "Sunday", active: false },
] as const;

function getDefaultSettings(): SiteSettings {
  return {
    deliveryDays: DEFAULT_DELIVERY_DAYS.map((d) => ({ ...d })),
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
}

