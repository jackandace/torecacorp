"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ShopChangeRequest } from "@/types/database";
import { formatJST } from "@/lib/dates";
import { parseRefundAccountJson, refundAccountOneLine } from "@/lib/refund-account";

type RequestWithShop = ShopChangeRequest & {
  shops?: { company_name?: string | null; contact_name?: string | null } | null;
};

const FIELD_LABEL: Record<string, string> = {
  delivery_address: "配送先住所",
  company_name: "会社名・屋号",
  address: "登録住所",
  refund_account: "返金先口座",
};

/** 返金先口座は new_value が JSON なので読める形に整形 */
function displayValue(r: Pick<ShopChangeRequest, "field" | "new_value">): string {
  if (r.field === "refund_account") {
    const a = parseRefundAccountJson(r.new_value);
    return a ? refundAccountOneLine(a) : r.new_value;
  }
  return r.new_value;
}

export function ChangeRequestList({ pending, history }: { pending: RequestWithShop[]; history: RequestWithShop[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const review = async (id: string, action: "approve" | "reject", note?: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote: note ?? null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "失敗");
      setRejectingId(null);
      setRejectNote("");
      router.refresh();
    } catch (e) {
      alert(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {/* 承認待ち */}
      {pending.length === 0 ? (
        <div className="card p-8 text-center text-slate-500 text-sm">承認待ちの申請はありません</div>
      ) : (
        <div className="space-y-4">
          {pending.map((r) => (
            <div key={r.id} className="card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <Link href={`/admin/shops/${r.shop_id}`} className="font-semibold text-brand-700 hover:underline">
                    {r.shops?.company_name ?? "—"}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">
                    担当: {r.shops?.contact_name ?? "—"} / 申請: {formatJST(r.created_at)}
                  </span>
                </div>
                <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                  {FIELD_LABEL[r.field] ?? r.field} の変更
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded p-3">
                  <div className="text-xs text-slate-500 mb-1">現在</div>
                  <div className="whitespace-pre-wrap">{r.current_value ?? "(未設定)"}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                  <div className="text-xs text-emerald-700 mb-1">変更後</div>
                  <div className="whitespace-pre-wrap font-medium">{displayValue(r)}</div>
                </div>
              </div>

              {r.reason && (
                <p className="text-xs text-slate-600">申請理由: {r.reason}</p>
              )}

              {rejectingId === r.id ? (
                <div className="space-y-2 border-t pt-3">
                  <label className="block text-xs text-slate-600">却下理由 (ショップへの通知に記載されます)</label>
                  <input
                    className="input text-sm"
                    placeholder="例: ご本人確認のためお電話にて確認させてください"
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:bg-slate-300"
                      disabled={busyId === r.id || !rejectNote.trim()}
                      onClick={() => review(r.id, "reject", rejectNote.trim())}
                    >
                      {busyId === r.id ? "…" : "却下を確定"}
                    </button>
                    <button type="button" className="btn-secondary text-sm" onClick={() => setRejectingId(null)}>
                      戻る
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 border-t pt-3">
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    disabled={busyId === r.id}
                    onClick={() => {
                      if (confirm(`承認して登録情報を書き換えますか?\n\n変更後: ${displayValue(r)}`)) {
                        review(r.id, "approve");
                      }
                    }}
                  >
                    {busyId === r.id ? "処理中…" : "✓ 承認して反映"}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    disabled={busyId === r.id}
                    onClick={() => setRejectingId(r.id)}
                  >
                    却下
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 履歴 */}
      <section>
        <h2 className="font-semibold mb-3 mt-8">処理履歴 (直近 50 件)</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">処理日時</th>
                <th className="text-left px-3 py-2">ショップ</th>
                <th className="text-left px-3 py-2">項目</th>
                <th className="text-left px-3 py-2">変更内容</th>
                <th className="text-left px-3 py-2">結果</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs">{r.reviewed_at ? formatJST(r.reviewed_at) : "—"}</td>
                  <td className="px-3 py-2">{r.shops?.company_name ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{FIELD_LABEL[r.field] ?? r.field}</td>
                  <td className="px-3 py-2 text-xs max-w-xs truncate">{displayValue(r)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded font-medium ${
                      r.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                    }`}>
                      {r.status === "approved" ? "承認" : "却下"}
                    </span>
                    {r.review_note && <div className="text-xs text-slate-500 mt-0.5">{r.review_note}</div>}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">処理履歴はまだありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
