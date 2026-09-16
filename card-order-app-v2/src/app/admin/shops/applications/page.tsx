// ショップ審査 (admin) — 公開フォーム /apply からの申請一覧
//
// 承認すると招待リンクが自動発行され、申請者へ登録案内メールが送られる。
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatJST } from "@/lib/dates";
import { BUSINESS_TYPE_LABEL } from "@/constants/business";
import type { ShopApplication, BusinessType } from "@/types/database";
import { ApplicationActions } from "./ApplicationActions";
import { ReissueInviteButton } from "./ReissueInviteButton";

type InviteState = "valid" | "expired" | "used";

/** 承認済み申請の招待リンク状態 (有効 / 期限切れ / 登録完了) */
function inviteStateOf(inv: { expires_at: string; used_at: string | null } | null | undefined): InviteState | null {
  if (!inv) return null;
  if (inv.used_at) return "used";
  return new Date(inv.expires_at) < new Date() ? "expired" : "valid";
}

const INVITE_STATE_LABEL: Record<InviteState, { label: string; tone: string }> = {
  valid:   { label: "登録リンク有効",   tone: "bg-blue-100 text-blue-800" },
  expired: { label: "登録リンク期限切れ", tone: "bg-rose-100 text-rose-700" },
  used:    { label: "ショップ登録完了",  tone: "bg-emerald-100 text-emerald-800" },
};

export const dynamic = "force-dynamic";
export const metadata = { title: "ショップ審査 | 管理" };

const STATUS_TABS = [
  { key: "pending",  label: "審査待ち" },
  { key: "approved", label: "承認済み" },
  { key: "rejected", label: "却下" },
] as const;

const STATUS_TONE: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-slate-100 text-slate-500",
};

export default async function ShopApplicationsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const status = STATUS_TABS.some((t) => t.key === searchParams.status)
    ? (searchParams.status as ShopApplication["status"])
    : "pending";

  const supabase = createClient();
  const [{ data: apps }, { count: pendingCount }] = await Promise.all([
    supabase
      .from("shop_applications")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("shop_applications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  // 承認済みタブでは招待リンクの状態 (期限切れ → 再発行が必要) を併せて表示する
  const inviteById = new Map<string, { expires_at: string; used_at: string | null }>();
  if (status === "approved") {
    const inviteIds = ((apps ?? []) as ShopApplication[]).map((a) => a.invite_id).filter((v): v is string => !!v);
    if (inviteIds.length > 0) {
      const { data: invites } = await supabase
        .from("registration_invites")
        .select("id, expires_at, used_at")
        .in("id", inviteIds);
      for (const inv of invites ?? []) inviteById.set(inv.id, { expires_at: inv.expires_at, used_at: inv.used_at });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/shops" className="text-sm text-brand-600 hover:underline">← 顧客管理</Link>
        <h1 className="text-2xl font-bold mt-1">ショップ審査</h1>
        <p className="text-sm text-slate-500 mt-1">
          申込みフォーム (<span className="font-mono">/apply</span>) からの卸取引の申請です。
          <b>承認すると招待リンクが自動発行され、申請者へ登録案内メールが送られます。</b>
        </p>
      </div>

      {/* ステータスタブ */}
      <div className="flex gap-2">
        {STATUS_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/shops/applications?status=${t.key}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              status === t.key ? "bg-brand-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
            {t.key === "pending" && (pendingCount ?? 0) > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-xs">{pendingCount}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {((apps ?? []) as ShopApplication[]).map((a) => {
          const inviteState = a.status === "approved" ? inviteStateOf(a.invite_id ? inviteById.get(a.invite_id) : null) : null;
          return (
          <div key={a.id} className="card p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div className="min-w-0 text-sm space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-base">{a.company_name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_TONE[a.status]}`}>
                    {STATUS_TABS.find((t) => t.key === a.status)?.label}
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                    {BUSINESS_TYPE_LABEL[a.business_type as BusinessType] ?? a.business_type}
                  </span>
                  {inviteState && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${INVITE_STATE_LABEL[inviteState].tone}`}>
                      {INVITE_STATE_LABEL[inviteState].label}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0.5 text-xs text-slate-600">
                  <span>担当: {a.contact_name}</span>
                  <span>📧 {a.email}</span>
                  <span>☎ {a.phone}</span>
                  <span>開業日: {a.opened_at ?? "—"}</span>
                  <span className="sm:col-span-2">登録住所: {a.address}</span>
                  <span className="sm:col-span-2">配送先: {a.delivery_address}{a.receiver_name ? `（受取: ${a.receiver_name}）` : ""}</span>
                  {a.billing_name && <span className="sm:col-span-2">請求書発行先: {a.billing_name}</span>}
                  {a.store_url && (
                    <span className="sm:col-span-2">
                      URL: <a href={a.store_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline break-all">{a.store_url}</a>
                    </span>
                  )}
                </div>
                {a.interested_titles && (
                  <p className="text-xs text-slate-700 bg-slate-50 rounded px-2 py-1">🎴 希望タイトル: {a.interested_titles}</p>
                )}
                {a.note && (
                  <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">📝 備考: {a.note}</p>
                )}
                {a.review_note && (
                  <p className="text-xs text-rose-800 bg-rose-50 rounded px-2 py-1">審査メモ: {a.review_note}</p>
                )}
                <p className="text-[11px] text-slate-400">
                  申請: {formatJST(a.created_at)}
                  {a.reviewed_at && ` / 審査: ${formatJST(a.reviewed_at)}`}
                </p>
              </div>
              {a.status === "pending" && <ApplicationActions applicationId={a.id} companyName={a.company_name} email={a.email} />}
              {a.status === "approved" && inviteState !== "used" && (
                <ReissueInviteButton applicationId={a.id} companyName={a.company_name} email={a.email} expired={inviteState === "expired"} />
              )}
            </div>
          </div>
          );
        })}
        {(!apps || apps.length === 0) && (
          <div className="card p-8 text-center text-slate-500 text-sm">
            {status === "pending" ? "審査待ちの申請はありません" : "該当する申請はありません"}
          </div>
        )}
      </div>
    </div>
  );
}
