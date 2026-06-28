import { verifyAdminRequest } from "@/lib/server/auth";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { jsonError, jsonOk } from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/security";
import { backInStockSchema } from "@/lib/server/validation";
import { processBackInStockForProduct } from "@/lib/server/orders-service";
import { isAdminSdkConfigured } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "admin-back-in-stock", 20, 60_000);
  if (!rateLimit.success) {
    return jsonError("Too many requests", 429, rateLimit);
  }

  if (!isAdminSdkConfigured()) {
    return jsonError("Server not configured", 503, rateLimit);
  }

  const admin = await verifyAdminRequest(request);
  if (!admin) {
    return jsonError("Admin access required", 403, rateLimit);
  }

  const body = await readJsonBody<unknown>(request);
  if (!body) {
    return jsonError("Invalid request body", 400, rateLimit);
  }

  const parsed = backInStockSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid product ID", 400, rateLimit);
  }

  try {
    const emailsSent = await processBackInStockForProduct(parsed.data.productId);
    return jsonOk({ success: true, emailsSent }, rateLimit);
  } catch (err) {
    console.error("[admin/alerts/back-in-stock]", err);
    return jsonError("Failed to process back-in-stock alerts", 500, rateLimit);
  }
}
