import { verifyAdminRequest } from "@/lib/server/auth";
import { applyRateLimit } from "@/lib/server/rate-limit";
import { jsonError, jsonOk } from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/security";
import { bulkPromoSchema } from "@/lib/server/validation";
import { generateBulkPromos } from "@/lib/server/orders-service";
import { isAdminSdkConfigured } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "admin-promos-bulk", 5, 60_000);
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

  const parsed = bulkPromoSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid promo data", 400, rateLimit);
  }

  try {
    const promos = await generateBulkPromos({
      prefix: parsed.data.prefix.toUpperCase(),
      count: parsed.data.count,
      discountPercent: parsed.data.discountPercent,
      description: parsed.data.description,
      startsAt: parsed.data.startsAt,
      expiresAt: parsed.data.expiresAt,
      minOrderAmount: parsed.data.minOrderAmount,
      active: parsed.data.active,
    });

    return jsonOk({ success: true, promos, count: promos.length }, rateLimit, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk generation failed";
    return jsonError(message, 400, rateLimit);
  }
}
