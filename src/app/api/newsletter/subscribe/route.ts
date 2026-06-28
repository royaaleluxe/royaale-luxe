import { applyRateLimit } from "@/lib/server/rate-limit";
import { jsonError, jsonOk } from "@/lib/server/api-response";
import { readJsonBody } from "@/lib/server/security";
import { newsletterSchema } from "@/lib/server/validation";
import { subscribeNewsletterServer } from "@/lib/server/orders-service";
import { isAdminSdkConfigured } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "newsletter", 3, 60_000);
  if (!rateLimit.success) {
    return jsonError("Too many requests. Please try again later.", 429, rateLimit);
  }

  if (!isAdminSdkConfigured()) {
    return jsonError("Newsletter service unavailable", 503, rateLimit);
  }

  const body = await readJsonBody<unknown>(request);
  if (!body) {
    return jsonError("Invalid request", 400, rateLimit);
  }

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Please enter a valid email address", 400, rateLimit);
  }

  try {
    const result = await subscribeNewsletterServer(parsed.data.email);
    return jsonOk(
      {
        success: true,
        message: result === "exists" ? "You're already on the list!" : "Welcome to the club!",
        alreadySubscribed: result === "exists",
      },
      rateLimit
    );
  } catch (err) {
    console.error("[newsletter/subscribe]", err);
    return jsonError("Subscription failed. Please try again.", 500, rateLimit);
  }
}
