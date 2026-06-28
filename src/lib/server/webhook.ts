import { formatCurrency } from "@/lib/constants";

export interface WebhookPayload {
  event: "new_order" | "order_cancelled" | "low_stock";
  orderId?: string;
  firestoreOrderId?: string;
  userName?: string;
  userEmail?: string;
  total?: number;
  message?: string;
  adminEmail?: string;
  timestamp: string;
}

export async function dispatchWebhook(payload: WebhookPayload): Promise<void> {
  const url = process.env.ADMIN_ORDER_WEBHOOK_URL?.trim();
  if (!url) return;

  const adminEmail = process.env.ADMIN_ALERT_EMAIL?.trim();
  const body = {
    ...payload,
    ...(adminEmail ? { adminEmail } : {}),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.WEBHOOK_SECRET
          ? { "X-Webhook-Secret": process.env.WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    console.error("[webhook:error]", err);
  }
}

export async function notifyAdminNewOrder(params: {
  orderId: string;
  firestoreOrderId: string;
  userName: string;
  userEmail: string;
  total: number;
}): Promise<void> {
  await dispatchWebhook({
    event: "new_order",
    orderId: params.orderId,
    firestoreOrderId: params.firestoreOrderId,
    userName: params.userName,
    userEmail: params.userEmail,
    total: params.total,
    message: `New order #${params.orderId} from ${params.userName} — ${formatCurrency(params.total)}`,
    timestamp: new Date().toISOString(),
  });
}
