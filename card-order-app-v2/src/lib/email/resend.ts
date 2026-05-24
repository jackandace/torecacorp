// Resend メール送信ラッパ
import { Resend } from "resend";

let cachedClient: Resend | null = null;

function getClient(): Resend {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY が未設定です");
  }
  cachedClient = new Resend(apiKey);
  return cachedClient;
}

export interface SendInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@torecacorp.jp";
  return getClient().emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });
}
