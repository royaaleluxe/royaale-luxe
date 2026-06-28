export const BRAND = {
  pink: "#FFF0F5",
  pinkAccent: "#FFD1DC",
  charcoal: "#1A1A1A",
  muted: "#6B7280",
  white: "#FFFFFF",
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function emailShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.pink};font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.charcoal};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.pink};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${BRAND.white};border-radius:24px;overflow:hidden;border:1px solid ${BRAND.pinkAccent};box-shadow:0 8px 32px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.pinkAccent} 0%,${BRAND.pink} 100%);padding:28px 32px;text-align:center;border-bottom:3px solid ${BRAND.charcoal};">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-style:italic;color:${BRAND.charcoal};letter-spacing:0.02em;">Royaale Luxe</p>
              <p style="margin:8px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:0.35em;color:${BRAND.muted};">Thee Royaale Way</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid ${BRAND.pinkAccent};text-align:center;">
              <p style="margin:0 0 8px;font-size:12px;color:${BRAND.muted};">Vieux-Fort, Saint Lucia</p>
              <p style="margin:0;font-size:11px;color:${BRAND.muted};">
                <a href="mailto:royaaleluxe@gmail.com" style="color:${BRAND.charcoal};text-decoration:none;">royaaleluxe@gmail.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px auto 0;">
    <tr>
      <td style="border-radius:999px;background:${BRAND.charcoal};">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 32px;font-size:13px;font-weight:600;color:${BRAND.white};text-decoration:none;text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;
}

export interface OrderEmailItem {
  title: string;
  color: string;
  size: string;
  quantity: number;
  lineTotal: number;
}

export function orderConfirmationEmail(params: {
  customerName: string;
  orderId: string;
  items: OrderEmailItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  district: string;
  community: string;
  accountUrl: string;
  formatCurrency: (n: number) => string;
}): { subject: string; html: string } {
  const itemRows = params.items
    .map(
      (item) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.pinkAccent};">
          <p style="margin:0;font-size:14px;font-weight:600;">${escapeHtml(item.title)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${BRAND.muted};">${escapeHtml(item.color)} · ${escapeHtml(item.size)} · Qty ${item.quantity}</p>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${BRAND.pinkAccent};text-align:right;font-size:14px;font-weight:600;">${escapeHtml(params.formatCurrency(item.lineTotal))}</td>
      </tr>`
    )
    .join("");

  const body = `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-style:italic;font-weight:normal;">Thank you, ${escapeHtml(params.customerName.split(" ")[0] || "love")}</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.muted};">Your order has been received and is pending payment verification. We&apos;ll notify you as soon as it&apos;s confirmed.</p>
    <div style="background:${BRAND.pink};border-radius:16px;padding:16px 20px;margin-bottom:24px;border:1px solid ${BRAND.pinkAccent};">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:${BRAND.muted};">Order number</p>
      <p style="margin:6px 0 0;font-size:20px;font-weight:700;font-family:monospace;">${escapeHtml(params.orderId)}</p>
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:16px;">
      ${itemRows}
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
      <tr><td style="padding:4px 0;color:${BRAND.muted};">Subtotal</td><td style="text-align:right;">${escapeHtml(params.formatCurrency(params.subtotal))}</td></tr>
      <tr><td style="padding:4px 0;color:${BRAND.muted};">Delivery (${escapeHtml(params.district)})</td><td style="text-align:right;">${escapeHtml(params.formatCurrency(params.deliveryFee))}</td></tr>
      ${params.discount > 0 ? `<tr><td style="padding:4px 0;color:#059669;">Discount</td><td style="text-align:right;color:#059669;">-${escapeHtml(params.formatCurrency(params.discount))}</td></tr>` : ""}
      <tr><td style="padding:12px 0 0;font-weight:700;font-size:16px;border-top:2px solid ${BRAND.pinkAccent};">Total</td><td style="padding:12px 0 0;text-align:right;font-weight:700;font-size:16px;border-top:2px solid ${BRAND.pinkAccent};">${escapeHtml(params.formatCurrency(params.total))}</td></tr>
    </table>
    <div style="margin-top:24px;padding:16px;background:${BRAND.pink};border-radius:12px;border-left:4px solid ${BRAND.charcoal};">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;">Delivering to</p>
      <p style="margin:0;font-size:14px;">${escapeHtml(params.community)}, ${escapeHtml(params.district)}</p>
    </div>
    ${primaryButton(params.accountUrl, "View Order")}`;

  return {
    subject: `Order Confirmed — ${params.orderId} | Royaale Luxe`,
    html: emailShell("Order Confirmation", body),
  };
}

export function backInStockEmail(params: {
  productTitle: string;
  color: string;
  size: string;
  productUrl: string;
}): { subject: string; html: string } {
  const body = `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:26px;font-style:italic;font-weight:normal;">It&apos;s back in stock</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:${BRAND.muted};">The piece you&apos;ve been waiting for is available again. Don&apos;t wait — island luxury moves fast.</p>
    <div style="background:linear-gradient(135deg,${BRAND.pink} 0%,${BRAND.pinkAccent} 100%);border-radius:16px;padding:24px;text-align:center;border:1px solid ${BRAND.pinkAccent};">
      <p style="margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.25em;color:${BRAND.muted};">Now available</p>
      <p style="margin:0;font-size:20px;font-weight:700;">${escapeHtml(params.productTitle)}</p>
      <p style="margin:8px 0 0;font-size:13px;color:${BRAND.muted};">${escapeHtml(params.color)} · Size ${escapeHtml(params.size)}</p>
    </div>
    ${primaryButton(params.productUrl, "Shop Now")}`;

  return {
    subject: `${params.productTitle} is back — Royaale Luxe`,
    html: emailShell("Back in Stock", body),
  };
}

export function orderCancelledEmail(params: {
  customerName: string;
  orderId: string;
  accountUrl: string;
}): { subject: string; html: string } {
  const body = `
    <h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:24px;font-style:italic;font-weight:normal;">Order cancelled</h1>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${BRAND.muted};">Hi ${escapeHtml(params.customerName.split(" ")[0] || "there")}, your order <strong>${escapeHtml(params.orderId)}</strong> has been cancelled. Inventory has been restored and no further action is needed.</p>
    ${primaryButton(params.accountUrl, "View Orders")}`;

  return {
    subject: `Order Cancelled — ${params.orderId} | Royaale Luxe`,
    html: emailShell("Order Cancelled", body),
  };
}
