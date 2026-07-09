"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopChangeRequest } from "@/types/database";
import { formatJST } from "@/lib/dates";
import {
  type RefundAccount,
  parseRefundAccountJson,
  refundAccountOneLine,
} from "@/lib/refund-account";

interface Props {
  current: RefundAccount | null;
  pendingRequests: ShopChangeRequest[];
  recentRequests: ShopChangeRequest[];
}

export function RefundAccountForm({ current, pendingRequests, recentRequests }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bankName, setBankName] = useState(current?.refund_bank_name ?? "");
  const [branch, setBranch] = useState(current?.refund_bank_branch ?? "");
  const [type, setType] = useState<"普通" | "当座">(current?.refund_account_type ?? "普通");
  const [number, setNumber] = useState(current?.refund_account_number ?? "");
  const [holder, setHolder] = useState(current?.refund_account_holder ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const pending = pendingRequests.filter((r) => r.field === "refund_account");
  const hasPending = pending.length > 0;

  const handleSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "refund_account",
          account: {
            refund_bank_name: bankName.trim(),
            refund_bank_branch: branch.trim(),
            refund_account_type: type,
            refund_account_number: number.trim(),
            refund_account_holder: holder.trim(),
          },
          reason: reason.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "申請失敗");
      setMessage({ kind: "ok", text: "口座の登録申請を送信しました。承認され次第、返金先として反映します。" });
      setReason("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setMessage({ kind: "err", text: `失敗: ${e instanceof Error ? e.message : "不明"}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-semibold">返金先口座 (登録・変更は申請制)</h2>
      <p className="text-xs text-slate-500">
        カット品の差額返金などが発生した際、こちらに登録の口座へお振り込みします。事前登録があれば支払通知書に自動記載されます。
      </p>

      {/* 現在の登録内容 */}
      <div className="bg-slate-50 rounded-lg p-4 text-sm">
        <div className="text-xs text-slate-500 mb-1">現在の登録口座</div>
        {current ? (
          <div className="space-y-0.5">
            <div>{current.refund_bank_name} {current.refund_bank_branch}</div>
            <div>{current.refund_account_type} {current.refund_account_number}</div>
            <div>名義: {current.refund_account_holder}</div>
          </div>
        ) : (
          <div className="text-slate-500">未登録 (返金時に支払通知書へ手書きでご記入いただく形になります)</div>
        )}
      </div>

      {/* 申請中 */}
      {hasPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm space-y-1">
          <div className="font-semibold text-amber-900">⏳ 口座の登録申請を確認中です</div>
          {pending.map((r) => {
            const a = parseRefundAccountJson(r.new_value);
            return (
              <div key={r.id} className="text-xs text-amber-800">
                申請日: {formatJST(r.created_at)} / 内容: {a ? refundAccountOneLine(a) : r.new_value}
              </div>
            );
          })}
          <p className="text-xs text-amber-700">担当者が確認のうえ反映します。</p>
        </div>
      )}

      {/* 申請フォーム */}
      {!hasPending &&
        (open ? (
          <div className="space-y-3 border border-slate-200 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">銀行名 *</label>
                <input className="input" placeholder="〇〇銀行" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">支店名 *</label>
                <input className="input" placeholder="〇〇支店" value={branch} onChange={(e) => setBranch(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">口座種別 *</label>
                <select className="input" value={type} onChange={(e) => setType(e.target.value as "普通" | "当座")}>
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">口座番号 * (数字のみ)</label>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="1234567"
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">口座名義 * (カナ)</label>
              <input className="input" placeholder="カ)トレカショウテン" value={holder} onChange={(e) => setHolder(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">変更理由 (任意)</label>
              <input className="input" placeholder="口座変更のため 等" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary text-sm" disabled={busy} onClick={handleSubmit}>
                {busy ? "送信中…" : "この口座を申請する"}
              </button>
              <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => setOpen(false)}>
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-secondary text-sm" onClick={() => setOpen(true)}>
            {current ? "返金先口座を変更する" : "返金先口座を登録する"}
          </button>
        ))}

      {message && (
        <p className={`text-xs ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{message.text}</p>
      )}

      <p className="text-xs text-slate-500">
        ※ 不正な送金先書き換えを防ぐため、口座の登録・変更は弊社確認後に反映されます (通常 1〜2 営業日)。
      </p>

      {/* 履歴 */}
      {recentRequests.filter((r) => r.field === "refund_account").length > 0 && (
        <details className="text-xs">
          <summary className="text-slate-500 cursor-pointer">過去の申請履歴</summary>
          <ul className="mt-2 space-y-1">
            {recentRequests
              .filter((r) => r.field === "refund_account")
              .map((r) => {
                const a = parseRefundAccountJson(r.new_value);
                return (
                  <li key={r.id} className="flex items-center gap-2">
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        r.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {r.status === "approved" ? "承認" : "却下"}
                    </span>
                    <span className="text-slate-600">
                      {formatJST(r.created_at)} — {a ? refundAccountOneLine(a) : "口座情報"}
                    </span>
                  </li>
                );
              })}
          </ul>
        </details>
      )}
    </section>
  );
}
