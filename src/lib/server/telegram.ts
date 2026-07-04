import { formatCurrency } from "@/lib/constants";

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim()?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[telegram:error]", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram:exception]", err);
    return false;
  }
}

export async function notifyAdminNewOrderTelegram(params: {
  orderId: string;
  firestoreOrderId: string;
  userName: string;
  userEmail: string;
  total: number;
}): Promise<void> {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || getAppUrl();
  const orderLink = `${adminUrl}/admin-portal?tab=orders&order=${params.firestoreOrderId}`;

  const message = [
    "🛍 <b>New Order — Royaale Luxe</b>",
    "",
    `<b>Order:</b> #${escapeHtml(params.orderId)}`,
    `<b>Customer:</b> ${escapeHtml(params.userName)}`,
    `<b>Email:</b> ${escapeHtml(params.userEmail)}`,
    `<b>Total:</b> ${escapeHtml(formatCurrency(params.total))}`,
    "",
    `<a href="${escapeHtml(orderLink)}">View in admin portal</a>`,
  ].join("\n");

  await sendTelegramMessage(message);
}

export async function notifyAdminOrderCancelledTelegram(params: {
  orderId: string;
  userName: string;
  userEmail: string;
}): Promise<void> {
  const message = [
    "❌ <b>Order Cancelled</b>",
    "",
    `<b>Order:</b> #${escapeHtml(params.orderId)}`,
    `<b>Customer:</b> ${escapeHtml(params.userName)}`,
    `<b>Email:</b> ${escapeHtml(params.userEmail)}`,
  ].join("\n");

  await sendTelegramMessage(message);
}

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_ADMIN_CHAT_ID?.trim()
  );
}
