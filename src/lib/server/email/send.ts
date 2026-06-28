import { Resend } from "resend";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Royaale Luxe <orders@royaaleluxe.com>";
}

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

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}
