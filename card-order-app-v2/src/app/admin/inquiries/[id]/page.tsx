import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL } from "@/constants/inquiry";
import { AdminInquiryActions } from "./AdminInquiryActions";
import { InquiryThread } from "@/app/(shop)/inquiries/[id]/InquiryThread";

export const dynamic = "force-dynamic";

export default async function AdminInquiryDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: inquiry } = await supabase
    .from("inquiries")
    .select("*, shops(id, company_name, contact_name, email), products(series, title, model_number)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!inquiry) notFound();

  const { data: messages } = await supabase
    .from("inquiry_messages")
    .select("*")
    .eq("inquiry_id", inquiry.id)
    .order("created_at");

  const shop = (inquiry as { shops?: { id: string; company_name: string; contact_name: string; email: string | null } }).shops;
  const product = (inquiry as { products?: { series: string | null; title: string; model_number: string | null } | null }).products;

  return (
    <div className="space-y-4 max-w-4xl">
      <Link href="/admin/inquiries" className="text-sm text-brand-600 hover:underline">← 一覧</Link>

      <div className="card p-5 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">{inquiry.subject}</h1>
            <div className="text-xs text-slate-500 mt-1">
              {INQUIRY_CATEGORY_LABEL[inquiry.category]} · {formatJST(inquiry.created_at)}
            </div>
            {shop && (
              <div className="text-sm mt-2">
                <Link href={`/admin/shops/${shop.id}`} className="text-brand-600 hover:underline font-medium">{shop.company_name}</Link>
                <span className="text-xs text-slate-500 ml-2">{shop.contact_name} / {shop.email ?? "—"}</span>
              </div>
            )}
            {product && (
              <div className="text-xs text-slate-500 mt-1">
                関連商品: {product.series ? `[${product.series}] ` : ""}{product.title}{product.model_number ? ` (${product.model_number})` : ""}
              </div>
            )}
          </div>
          <AdminInquiryActions inquiryId={inquiry.id} status={inquiry.status} />
        </div>
        <div className="text-xs text-slate-400">状態: {INQUIRY_STATUS_LABEL[inquiry.status]}</div>
      </div>

      <InquiryThread
        inquiryId={inquiry.id}
        initialBody={inquiry.body}
        messages={messages ?? []}
        fromKind="admin"
        closed={inquiry.status === "closed"}
      />
    </div>
  );
}
