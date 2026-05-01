import { createHmac } from "node:crypto";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

const UNSUBSCRIBE_SECRET =
  (process.env.UNSUBSCRIBE_SECRET ?? "rawstock-unsub-dev-secret").trim();

export function generateUnsubscribeToken(email: string): string {
  return createHmac("sha256", UNSUBSCRIBE_SECRET)
    .update(email.toLowerCase())
    .digest("hex");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = generateUnsubscribeToken(email.toLowerCase());
  if (expected.length !== token.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Send a single email. Switch EMAIL_PROVIDER env var to enable a real provider.
 *
 * EMAIL_PROVIDER=log      (default) — logs to console, no actual send
 * EMAIL_PROVIDER=resend   — uses Resend API (RESEND_API_KEY + EMAIL_FROM required)
 */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const provider = (process.env.EMAIL_PROVIDER ?? "log").trim();

  if (provider === "log") {
    console.log(
      `[emailAdapter] LOG to=${msg.to} subject="${msg.subject}" (set EMAIL_PROVIDER=resend to send for real)`
    );
    return;
  }

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY ?? "";
    const from = process.env.EMAIL_FROM ?? "noreply@rawstock.jp";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: msg.to, subject: msg.subject, html: msg.html }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend error ${res.status}: ${body}`);
    }
    return;
  }

  throw new Error(`Unknown EMAIL_PROVIDER: ${provider}`);
}
