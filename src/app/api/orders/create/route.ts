import { NextResponse } from "next/server";
import { verifyCustomerRequest } from "@/lib/server/auth";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { jsonError, jsonOk } from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/security";
import { createOrderSchema } from "@/lib/server/validation";
import { createOrderServer, verifyOrderOwnership } from "@/lib/server/orders-service";
import { isAdminSdkConfigured } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "orders-create", 5, 60_000);
  if (!rateLimit.success) {
    return jsonError("Too many requests. Please wait a moment.", 429, rateLimit);
  }

  if (!isAdminSdkConfigured()) {
    return jsonError("Order service unavailable", 503, rateLimit);
  }

  const user = await verifyCustomerRequest(request);
  if (!user) {
    return jsonError("Authentication required", 401, rateLimit);
  }

  const body = await readJsonBody<unknown>(request);
  if (!body) {
    return jsonError("Invalid request body", 400, rateLimit);
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid order data", 400, rateLimit);
  }

  try {
    const result = await createOrderServer(user.uid, parsed.data);
    return jsonOk(
      {
        success: true,
        firestoreOrderId: result.firestoreOrderId,
        orderId: result.orderId,
        total: result.order.total,
      },
      rateLimit,
      201
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Order failed";
    console.error("[orders/create]", err);
    return jsonError(message, 400, rateLimit);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
