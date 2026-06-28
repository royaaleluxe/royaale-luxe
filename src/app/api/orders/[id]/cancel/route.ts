import { verifyCustomerRequest } from "@/lib/server/auth";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { jsonError, jsonOk } from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/security";
import { cancelOrderSchema } from "@/lib/server/validation";
import { cancelOrderServer } from "@/lib/server/orders-service";
import { isAdminSdkConfigured } from "@/lib/firebase-admin";
import { dispatchWebhook } from "@/lib/server/webhook";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const rateLimit = applyRateLimit(request, "orders-cancel", 5, 60_000);
  if (!rateLimit.success) {
    return jsonError("Too many requests", 429, rateLimit);
  }

  if (!isAdminSdkConfigured()) {
    return jsonError("Service unavailable", 503, rateLimit);
  }

  const user = await verifyCustomerRequest(request);
  if (!user) {
    return jsonError("Authentication required", 401, rateLimit);
  }

  const firestoreOrderId = params.id;
  if (!firestoreOrderId || firestoreOrderId.length > 128) {
    return jsonError("Invalid order ID", 400, rateLimit);
  }

  const body = await readJsonBody<unknown>(request);
  const parsed = cancelOrderSchema.safeParse(body ?? {});
  const reason = parsed.success ? parsed.data.reason : undefined;

  try {
    await cancelOrderServer(user.uid, firestoreOrderId, reason);

    dispatchWebhook({
      event: "order_cancelled",
      firestoreOrderId,
      message: `Order ${firestoreOrderId} cancelled by customer`,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return jsonOk({ success: true }, rateLimit);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cancellation failed";
    const status = message === "Unauthorized" ? 403 : message === "Order not found" ? 404 : 400;
    return jsonError(message, status, rateLimit);
  }
}
