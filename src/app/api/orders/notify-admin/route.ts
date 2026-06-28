import { verifyCustomerRequest } from "@/lib/server/auth";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { jsonError, jsonOk } from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/security";
import { notifyAdminSchema } from "@/lib/server/validation";
import { storeAdminAlert, verifyOrderOwnership } from "@/lib/server/orders-service";
import { notifyAdminNewOrder } from "@/lib/server/webhook";
import { getAdminFirestore, isAdminSdkConfigured } from "@/lib/firebase-admin";
import { formatCurrency } from "@/lib/constants";
import type { Order } from "@/lib/types";

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "notify-admin", 10, 60_000);
  if (!rateLimit.success) {
    return jsonError("Too many requests", 429, rateLimit);
  }

  if (!isAdminSdkConfigured()) {
    return jsonOk({ ok: true, alertStored: false }, rateLimit);
  }

  const user = await verifyCustomerRequest(request);
  if (!user) {
    return jsonError("Authentication required", 401, rateLimit);
  }

  const body = await readJsonBody<unknown>(request);
  if (!body) {
    return jsonError("Invalid request body", 400, rateLimit);
  }

  const parsed = notifyAdminSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, rateLimit);
  }

  const { orderId, firestoreOrderId } = parsed.data;
  const ownsOrder = await verifyOrderOwnership(user.uid, firestoreOrderId, orderId);
  if (!ownsOrder) {
    return jsonError("Order not found", 404, rateLimit);
  }

  try {
    const adminDb = getAdminFirestore();
    if (!adminDb) {
      return jsonOk({ ok: true, alertStored: false }, rateLimit);
    }

    const orderSnap = await adminDb.collection("orders").doc(firestoreOrderId).get();
    const order = orderSnap.data() as Order | undefined;

    await storeAdminAlert({
      type: "new_order",
      message: `New order #${orderId} from ${order?.userName || "customer"} — ${order?.total != null ? formatCurrency(order.total) : "pending"}`,
      orderId,
      firestoreOrderId,
    });

    if (order) {
      await notifyAdminNewOrder({
        orderId,
        firestoreOrderId,
        userName: order.userName,
        userEmail: order.userEmail,
        total: order.total,
      });
    }

    return jsonOk({ ok: true, alertStored: true }, rateLimit);
  } catch (error) {
    console.error("notify-admin error:", error);
    return jsonError("Failed to notify admin", 500, rateLimit);
  }
}
