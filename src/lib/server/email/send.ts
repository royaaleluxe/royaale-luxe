import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { Resend } from "resend";

let resendClient: Resend | null = null;
let gmailTransport: Transporter | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Royaale Luxe <orders@royaaleluxe.com>";
}

function getOrderFromEmail(): string {
  return (
    process.env.GMAIL_FROM_EMAIL?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    "Royaale Luxe <royaaleluxe@gmail.com>"
  );
}

function getGmailTransport(): Transporter | null {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !pass) return null;
  if (!gmailTransport) {
    gmailTransport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return gmailTransport;
}

/** Order confirmations and cancellations — sent from royaaleluxe@gmail.com via Gmail SMTP. */
export async function sendOrderEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const transport = getGmailTransport();
  if (!transport) {
    if (process.env.NODE_ENV === "development") {
      console.info("[order-email:skipped]", params.subject, "→", params.to);
    }
    return false;
  }

  try {
    await transport.sendMail({
      from: getOrderFromEmail(),
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: process.env.GMAIL_USER?.trim() || "royaaleluxe@gmail.com",
    });
    return true;
  } catch (err) {
    console.error("[order-email:exception]", err);
    return false;
  }
}

/** Marketing and alert emails via Resend (back-in-stock, etc.). */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const client = getResend();
  if (!client) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email:skipped]", params.subject, "→", params.to);
    }
    return false;
  }

  try {
    const { error } = await client.emails.send({
      from: getFromEmail(),
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error("[email:error]", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email:exception]", err);
    return false;
  }
}

export function isOrderEmailConfigured(): boolean {
  return Boolean(
    process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim()
  );
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
