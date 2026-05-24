// Supabase Storage ヘルパ (署名付き URL 生成・アップロード)
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function uploadInvoicePdf(args: {
  supabase: SupabaseClient<Database>;
  invoiceNumber: string;
  buffer: Buffer;
}): Promise<string> {
  const path = `${new Date().getFullYear()}/${args.invoiceNumber}.pdf`;
  const { error } = await args.supabase.storage
    .from("invoices")
    .upload(path, args.buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) throw error;
  return path;
}

export async function signedInvoiceUrl(args: {
  supabase: SupabaseClient<Database>;
  path: string;
  ttlSeconds?: number;
}): Promise<string> {
  const { data, error } = await args.supabase.storage
    .from("invoices")
    .createSignedUrl(args.path, args.ttlSeconds ?? 3600);
  if (error || !data) throw error ?? new Error("failed to sign");
  return data.signedUrl;
}

export async function signedOathUrl(args: {
  supabase: SupabaseClient<Database>;
  path: string;
}): Promise<string> {
  const { data, error } = await args.supabase.storage
    .from("oath-documents")
    .createSignedUrl(args.path, 3600);
  if (error || !data) throw error ?? new Error("failed to sign");
  return data.signedUrl;
}
