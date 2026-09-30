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
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendInput) {
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@torecacorp.jp";
  const result = await getClient().emails.send({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  });
  // Resend は送信失敗 (宛先不正・レート制限・認証エラー等) でも例外を投げず { error } を返す。
  // 呼び出し側の try/catch で「失敗」として記録・再送判定できるよう、ここで例外にする。
  if (result.error) {
    throw new Error(`メール送信に失敗しました (${result.error.name}): ${result.error.message}`);
  }
  return result;
}
