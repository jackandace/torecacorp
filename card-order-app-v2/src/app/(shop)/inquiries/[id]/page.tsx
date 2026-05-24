import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, INQUIRY_STATUS_TONE } from "@/constants/inquiry";
import { InquiryThread } from "./InquiryThread";

export const dynamic = "force-dynamic";

export default async function InquiryDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("*, products(series, title, model_number)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!inquiry) notFound();

  const { data: messages } = await supabase
    .from("inquiry_messages")
    .select("*")
    .eq("inquiry_id", inquiry.id)
    .order("created_at");

  const product = (inquiry as { products?: { series: string | null; title: string; model_number: string | null } | null }).products;

  return (
    <div className="space-y-4 max-w-3xl">
      <Link href="/inquiries" className="text-sm text-brand-600 hover:underline">← 一覧</Link>
      <div className="card p-5 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{inquiry.subject}</h1>
            <div className="text-xs text-slate-500 mt-1">
              {INQUIRY_CATEGORY_LABEL[inquiry.category]} · {formatJST(inquiry.created_at)}
              {product && ` · 関連商品: ${product.series ? `[${product.series}] ` : ""}${product.title}${product.model_number ? ` (${product.model_number})` : ""}`}
            </div>
          </div>
          <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded font-medium ${INQUIRY_STATUS_TONE[inquiry.status]}`}>
            {INQUIRY_STATUS_LABEL[inquiry.status]}
          </span>
        </div>
      </div>

      <InquiryThread inquiryId={inquiry.id} initialBody={inquiry.body} messages={messages ?? []} fromKind="shop" closed={inquiry.status === "closed"} />
    </div>
  );
}
