import type { Firestore } from "firebase-admin/firestore";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase-admin";
import { buildVariantRestores, buildVariantUpdates } from "@/lib/orders";
import { getStockForVariant } from "@/lib/products";
import { validatePromoCode, calculateDiscount } from "@/lib/promos";
import { formatCurrency, generateOrderId, SAINT_LUCIA_DISTRICTS } from "@/lib/constants";
import type { CartItem, DistrictFee, Order, Product, PromoCode, SiteSettings, UserProfile } from "@/lib/types";
import type { CreateOrderInput } from "./validation";
import { sendOrderEmail, sendEmail } from "./email/send";
import { orderConfirmationEmail, orderCancelledEmail, backInStockEmail } from "./email/templates";
import { notifyAdminNewOrder } from "./webhook";
import { notifyAdminOrderCancelledTelegram } from "./telegram";

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    variants: product.variants ?? [],
    price: product.price ?? 0,
  };
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}

async function fetchPromos(db: Firestore): Promise<PromoCode[]> {
  const snap = await db.collection("promos").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PromoCode));
}

async function fetchSiteSettings(db: Firestore): Promise<SiteSettings | null> {
  const snap = await db.doc("settings/site").get();
  return snap.exists ? (snap.data() as SiteSettings) : null;
}

async function fetchDistrictFee(db: Firestore, district: string): Promise<number> {
  const id = district.replace(/\s/g, "-").toLowerCase();
  const snap = await db.doc(`districtFees/${id}`).get();
  if (!snap.exists) return 0;
  const fee = snap.data() as DistrictFee;
  if (!fee.active) return 0;
  return fee.fee ?? 0;
}

function validatePrices(items: CartItem[], products: Map<string, Product>): CartItem[] {
  return items.map((item) => {
    const product = products.get(item.productId);
    if (!product) throw new Error(`Product "${item.title}" is no longer available`);
    if (Math.abs(item.price - product.price) > 0.01) {
      throw new Error(`Price changed for "${item.title}". Please refresh your cart.`);
    }
    return { ...item, price: product.price };
  });
}

export interface CreateOrderResult {
  firestoreOrderId: string;
  orderId: string;
  order: Omit<Order, "id">;
}

export async function createOrderServer(
  userId: string,
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const adminDb = getAdminFirestore();
  if (!adminDb) throw new Error("Server not configured");

  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const authUser = await adminAuth.getUser(userId);
      const isGoogle = authUser.providerData.some((p) => p.providerId === "google.com");
      if (!isGoogle && !authUser.emailVerified) {
        throw new Error("Please verify your email before placing an order.");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("verify your email")) throw err;
      // Continue if auth lookup fails for other reasons
    }
  }

  const userSnap = await adminDb.collection("users").doc(userId).get();
  if (userSnap.exists && userSnap.data()?.disabled === true) {
    throw new Error("Your account has been disabled. Contact support.");
  }

  const [promos, settings] = await Promise.all([
    fetchPromos(adminDb),
    fetchSiteSettings(adminDb),
  ]);

  const productMap = new Map<string, Product>();
  for (const item of input.items) {
    if (productMap.has(item.productId)) continue;
    const snap = await adminDb.collection("products").doc(item.productId).get();
    if (!snap.exists) throw new Error(`Product "${item.title}" is no longer available`);
    productMap.set(snap.id, normalizeProduct({ id: snap.id, ...snap.data() } as Product));
  }

  const validatedItems = validatePrices(input.items, productMap);

  for (const item of validatedItems) {
    const product = productMap.get(item.productId)!;
    const available = getStockForVariant(product, item.color, item.size);
    if (available < item.quantity) {
      throw new Error(
        available <= 0
          ? `${item.title} (${item.color}/${item.size}) is sold out`
          : `Only ${available} left for ${item.title} (${item.color}/${item.size})`
      );
    }
  }

  const subtotal = validatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = await fetchDistrictFee(adminDb, input.district);

  if (!SAINT_LUCIA_DISTRICTS.includes(input.district)) {
    throw new Error("Invalid delivery district");
  }

  let discount = 0;
  let couponCode: string | undefined;
  if (input.couponCode?.trim()) {
    const promoResult = validatePromoCode(input.couponCode, subtotal, promos, settings);
    if (!promoResult.valid) throw new Error(promoResult.message || "Invalid promo code");
    discount = calculateDiscount(subtotal, promoResult.promo);
    couponCode = input.couponCode.trim().toUpperCase();
  }

  const total = subtotal + deliveryFee - discount;
  const userName = `${input.firstName} ${input.lastName}`.trim();
  const orderId = input.orderId || generateOrderId();

  const order: Omit<Order, "id"> = stripUndefined({
    orderId,
    userId,
    userEmail: input.email,
    userName,
    items: validatedItems,
    subtotal,
    deliveryFee,
    discount,
    total,
    delivery: {
      district: input.district,
      community: input.community,
      directions: input.directions,
      phone: input.phone,
    },
    bankId: input.bankId,
    receiptUrl: input.receiptUrl,
    status: "Pending Verification",
    ...(couponCode ? { couponCode } : {}),
    createdAt: new Date().toISOString(),
  });

  const firestoreOrderId = await adminDb.runTransaction(async (transaction) => {
    const txProductMap = new Map<string, Product>();
    for (const item of validatedItems) {
      const ref = adminDb.collection("products").doc(item.productId);
      const snap = await transaction.get(ref);
      if (!snap.exists) throw new Error("A product in your cart is no longer available");
      txProductMap.set(
        snap.id,
        normalizeProduct({ id: snap.id, ...snap.data() } as Product)
      );
    }

    const updates = buildVariantUpdates(validatedItems, txProductMap);
    for (const { productId, variants } of updates) {
      transaction.update(adminDb.collection("products").doc(productId), { variants });
    }

    const orderRef = adminDb.collection("orders").doc();
    transaction.set(orderRef, order);
    return orderRef.id;
  });

  await adminDb.collection("adminAlerts").add({
    type: "new_order",
    message: `New order #${orderId} from ${userName} — ${formatCurrency(total)}`,
    orderId,
    firestoreOrderId,
    read: false,
    createdAt: new Date().toISOString(),
  });

  const profile = userSnap.exists ? (userSnap.data() as UserProfile) : null;
  const history = [...(profile?.orderHistory || []), orderId];

  const profileUpdate: Record<string, unknown> = {
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phoneNumber: input.phone,
    orderHistory: history,
  };

  if (input.saveAddress) {
    const savedAddresses = profile?.savedAddresses || [];
    const newAddr = {
      id: `addr-${Date.now()}`,
      label: input.community,
      district: input.district,
      community: input.community,
      directions: input.directions,
      phone: input.phone,
      isDefault: savedAddresses.length === 0,
    };
    profileUpdate.savedAddresses = [...savedAddresses, newAddr];
  }

  await adminDb.collection("users").doc(userId).set(profileUpdate, { merge: true });

  const emailTemplate = orderConfirmationEmail({
    customerName: userName,
    orderId,
    items: validatedItems.map((i) => ({
      title: i.title,
      color: i.color,
      size: i.size,
      quantity: i.quantity,
      lineTotal: i.price * i.quantity,
    })),
    subtotal,
    deliveryFee,
    discount,
    total,
    district: input.district,
    community: input.community,
    accountUrl: `${getAppUrl()}/account/orders/${firestoreOrderId}`,
    formatCurrency,
  });

  sendOrderEmail({ to: input.email, ...emailTemplate }).catch(() => {});

  notifyAdminNewOrder({
    orderId,
    firestoreOrderId,
    userName,
    userEmail: input.email,
    total,
  }).catch(() => {});

  return { firestoreOrderId, orderId, order };
}

export async function cancelOrderServer(
  userId: string,
  firestoreOrderId: string,
  reason?: string
): Promise<void> {
  const adminDb = getAdminFirestore();
  if (!adminDb) throw new Error("Server not configured");

  const orderRef = adminDb.collection("orders").doc(firestoreOrderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error("Order not found");

  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;
  if (order.userId !== userId) throw new Error("Unauthorized");
  if (order.status !== "Pending Verification") {
    throw new Error("Only orders pending verification can be cancelled");
  }

  await adminDb.runTransaction(async (transaction) => {
    const freshSnap = await transaction.get(orderRef);
    if (!freshSnap.exists) throw new Error("Order not found");
    const fresh = { id: freshSnap.id, ...freshSnap.data() } as Order;
    if (fresh.status !== "Pending Verification") throw new Error("Order can no longer be cancelled");

    const productMap = new Map<string, Product>();
    for (const item of fresh.items) {
      const ref = adminDb.collection("products").doc(item.productId);
      const snap = await transaction.get(ref);
      if (snap.exists) {
        productMap.set(
          snap.id,
          normalizeProduct({ id: snap.id, ...snap.data() } as Product)
        );
      }
    }

    const restores = buildVariantRestores(fresh.items, productMap);
    for (const { productId, variants } of restores) {
      transaction.update(adminDb.collection("products").doc(productId), { variants });
    }

    const note = reason ? `Customer cancelled: ${reason}` : "Customer cancelled";
    transaction.update(orderRef, {
      status: "Cancelled",
      internalNotes: fresh.internalNotes ? `${fresh.internalNotes}\n${note}` : note,
    });
  });

  const notification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    message: `Order #${order.orderId} has been cancelled.`,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const userRef = adminDb.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    const data = userSnap.data() as UserProfile;
    const notifications = [notification, ...(data.notifications || [])].slice(0, 50);
    await userRef.update({ notifications });
  }

  const cancelEmail = orderCancelledEmail({
    customerName: order.userName,
    orderId: order.orderId,
    accountUrl: `${getAppUrl()}/account?tab=orders`,
  });
  sendOrderEmail({ to: order.userEmail, ...cancelEmail }).catch(() => {});

  notifyAdminOrderCancelledTelegram({
    orderId: order.orderId,
    userName: order.userName,
    userEmail: order.userEmail,
  }).catch(() => {});

  for (const item of order.items) {
    processBackInStockForProduct(item.productId).catch(() => {});
  }
}

export async function processBackInStockForProduct(productId: string): Promise<number> {
  const adminDb = getAdminFirestore();
  if (!adminDb) return 0;

  const productSnap = await adminDb.collection("products").doc(productId).get();
  if (!productSnap.exists) return 0;

  const product = normalizeProduct({ id: productSnap.id, ...productSnap.data() } as Product);
  const usersSnap = await adminDb.collection("users").get();
  let sent = 0;
  const appUrl = getAppUrl();

  for (const userDoc of usersSnap.docs) {
    const profile = userDoc.data() as UserProfile;
    const alerts = profile.backInStockAlerts || [];
    if (!alerts.length) continue;

    const remaining = [...alerts];
    let changed = false;

    for (const alert of alerts) {
      if (alert.productId !== productId) continue;
      const stock = getStockForVariant(product, alert.color, alert.size);
      if (stock <= 0) continue;

      const email = profile.email;
      if (email) {
        const template = backInStockEmail({
          productTitle: product.title,
          color: alert.color,
          size: alert.size,
          productUrl: `${appUrl}/products/${productId}`,
        });
        const ok = await sendEmail({ to: email, ...template });
        if (ok) sent++;
      }

      const idx = remaining.findIndex(
        (a) =>
          a.productId === alert.productId &&
          a.color === alert.color &&
          a.size === alert.size
      );
      if (idx >= 0) {
        remaining.splice(idx, 1);
        changed = true;
      }

      await pushUserNotificationAdmin(adminDb, userDoc.id, `${product.title} (${alert.color}/${alert.size}) is back in stock!`);
    }

    if (changed) {
      await userDoc.ref.update({ backInStockAlerts: remaining });
    }
  }

  return sent;
}

async function pushUserNotificationAdmin(
  db: Firestore,
  userId: string,
  message: string
): Promise<void> {
  const userRef = db.collection("users").doc(userId);
  const snap = await userRef.get();
  if (!snap.exists) return;
  const data = snap.data() as UserProfile;
  const notifications = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    },
    ...(data.notifications || []),
  ].slice(0, 50);
  await userRef.update({ notifications });
}

export async function verifyOrderOwnership(
  userId: string,
  firestoreOrderId: string,
  orderId: string
): Promise<boolean> {
  const adminDb = getAdminFirestore();
  if (!adminDb) return false;
  const snap = await adminDb.collection("orders").doc(firestoreOrderId).get();
  if (!snap.exists) return false;
  const order = snap.data() as Order;
  return order.userId === userId && order.orderId === orderId;
}

export async function storeAdminAlert(params: {
  type: "new_order" | "low_stock";
  message: string;
  orderId?: string;
  firestoreOrderId?: string;
}): Promise<void> {
  const adminDb = getAdminFirestore();
  if (!adminDb) return;
  await adminDb.collection("adminAlerts").add({
    ...params,
    read: false,
    createdAt: new Date().toISOString(),
  });
}

export async function generateBulkPromos(params: {
  prefix: string;
  count: number;
  discountPercent: number;
  description?: string;
  startsAt?: string;
  expiresAt?: string;
  minOrderAmount?: number;
  active?: boolean;
}): Promise<{ code: string; id: string }[]> {
  const adminDb = getAdminFirestore();
  if (!adminDb) throw new Error("Server not configured");

  const existingSnap = await adminDb.collection("promos").get();
  const existingCodes = new Set(existingSnap.docs.map((d) => (d.data().code as string).toUpperCase()));

  const created: { code: string; id: string }[] = [];
  const batch = adminDb.batch();
  const now = new Date().toISOString();

  let attempts = 0;
  while (created.length < params.count && attempts < params.count * 10) {
    attempts++;
    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `${params.prefix}${suffix}`;
    if (existingCodes.has(code)) continue;
    existingCodes.add(code);

    const ref = adminDb.collection("promos").doc();
    batch.set(ref, stripUndefined({
      code,
      discountPercent: params.discountPercent,
      active: params.active ?? true,
      description: params.description,
      startsAt: params.startsAt,
      expiresAt: params.expiresAt,
      minOrderAmount: params.minOrderAmount,
      createdAt: now,
    }));
    created.push({ code, id: ref.id });
  }

  if (created.length === 0) throw new Error("Could not generate unique promo codes");
  await batch.commit();
  return created;
}

export async function subscribeNewsletterServer(email: string): Promise<"created" | "exists"> {
  const adminDb = getAdminFirestore();
  if (!adminDb) throw new Error("Server not configured");

  const existing = await adminDb
    .collection("newsletter")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existing.empty) return "exists";

  await adminDb.collection("newsletter").add({
    email,
    subscribedAt: new Date().toISOString(),
    source: "website",
  });
  return "created";
}
