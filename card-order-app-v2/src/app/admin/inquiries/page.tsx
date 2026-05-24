import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS_LABEL, INQUIRY_STATUS_TONE } from "@/constants/inquiry";
import type { InquiryStatus } from "@/types/database";

export const metadata = { title: "問い合わせ管理 | 管理" };
export const dynamic = "force-dynamic";

interface SearchParams { status?: string; page?: string }
const PAGE_SIZE = 30;

const STATUSES: { v: "all" | InquiryStatus; label: string }[] = [
  { v: "all",           label: "全部" },
  { v: "open",          label: "新規" },
  { v: "in_progress",   label: "対応中" },
  { v: "waiting_shop",  label: "顧客待ち" },
  { v: "resolved",      label: "解決済み" },
  { v: "closed",        label: "クローズ" },
];

export default async function InquiriesAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const status = (searchParams.status ?? "all") as "all" | InquiryStatus;

  let q = supabase
    .from("inquiries")
    .select("*, shops(company_name)", { count: "exact" })
    .is("deleted_at", null);
  if (status !== "all") q = q.eq("status", status);

  const { data: inquiries, count } = await q
    .order("status")
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">問い合わせ ({count ?? 0})</h1>
        <Link href="/admin/faqs" className="btn-secondary">FAQ 管理</Link>
      </div>

      <div className="card p-4 flex flex-wrap gap-1 text-xs">
        {STATUSES.map((s) => (
          <Link
            key={s.v}
            href={s.v === "all" ? "/admin/inquiries" : `/admin/inquiries?status=${s.v}`}
            className={`px-3 py-1 rounded-full border ${
              status === s.v
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >{s.label}</Link>
        ))}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">件名</th>
              <th className="text-left px-3 py-2">ショップ</th>
              <th className="text-left px-3 py-2">カテゴリ</th>
              <th className="text-left px-3 py-2">状態</th>
              <th className="text-left px-3 py-2">最終返信</th>
              <th className="text-left px-3 py-2">作成日</th>
            </tr>
          </thead>
          <tbody>
            {(inquiries ?? []).map((i) => {
              const shop = (i as { shops?: { company_name?: string } }).shops;
              const fromAdmin = i.last_reply_by === "admin";
              return (
                <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <Link href={`/admin/inquiries/${i.id}`} className="text-brand-700 hover:underline font-medium">
                      {i.subject}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs">{shop?.company_name ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{INQUIRY_CATEGORY_LABEL[i.category]}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded font-medium ${INQUIRY_STATUS_TONE[i.status]}`}>
                      {INQUIRY_STATUS_LABEL[i.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {i.last_reply_at ? formatJST(i.last_reply_at) : "—"}
                    {fromAdmin && <span className="ml-1 text-slate-500">(管理)</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{formatJST(i.created_at)}</td>
                </tr>
              );
            })}
            {(!inquiries || inquiries.length === 0) && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-500">該当する問い合わせはありません</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 text-sm">
          {page > 1 && <Link href={`?status=${status}&page=${page - 1}`} className="btn-secondary text-xs">← 前</Link>}
          <span className="text-slate-500">{page} / {totalPages}</span>
          {page < totalPages && <Link href={`?status=${status}&page=${page + 1}`} className="btn-secondary text-xs">次 →</Link>}
        </div>
      )}
    </div>
  );
}
