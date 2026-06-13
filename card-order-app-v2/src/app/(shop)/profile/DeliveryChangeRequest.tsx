"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopChangeRequest } from "@/types/database";
import { formatJST } from "@/lib/dates";

interface Props {
  shopId: string;
  currentAddress: string | null;
  pendingRequests: ShopChangeRequest[];
  recentRequests: ShopChangeRequest[];
}

export function DeliveryChangeRequest({ currentAddress, pendingRequests, recentRequests }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const hasPendingDelivery = pendingRequests.some((r) => r.field === "delivery_address");

  const handleSubmit = async () => {
    if (!newValue.trim()) {
      setMessage({ kind: "err", text: "新しい配送先を入力してください" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/change-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "delivery_address",
          newValue: newValue.trim(),
          reason: reason.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "申請失敗");
      setMessage({ kind: "ok", text: "変更申請を送信しました。承認され次第、反映とご連絡をいたします。" });
      setNewValue("");
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
      <h2 className="font-semibold">配送先住所 (変更は申請制)</h2>

      <div className="bg-slate-50 rounded-lg p-4 text-sm">
        <div className="text-xs text-slate-500 mb-1">現在の配送先</div>
        <div className="whitespace-pre-wrap">{currentAddress ?? "未設定 (登録住所にお届けします)"}</div>
      </div>

      {/* 申請中の表示 */}
      {hasPendingDelivery && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm space-y-1">
          <div className="font-semibold text-amber-900">⏳ 変更申請を確認中です</div>
          {pendingRequests
            .filter((r) => r.field === "delivery_address")
            .map((r) => (
              <div key={r.id} className="text-xs text-amber-800">
                申請日: {formatJST(r.created_at)} / 申請内容: {r.new_value}
              </div>
            ))}
          <p className="text-xs text-amber-700">
            担当者が確認のうえ反映します。お急ぎの場合はお問い合わせフォームからご連絡ください。
          </p>
        </div>
      )}

      {/* 申請フォーム */}
      {!hasPendingDelivery && (
        open ? (
          <div className="space-y-3 border border-slate-200 rounded-lg p-4">
            <div>
              <label className="block text-xs text-slate-600 mb-1">新しい配送先住所 *</label>
              <textarea
                className="input"
                rows={2}
                placeholder="〒123-4567 東京都〇〇区…"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">変更理由 (任意)</label>
              <input
                className="input"
                placeholder="店舗移転のため 等"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-primary text-sm" disabled={busy} onClick={handleSubmit}>
                {busy ? "送信中…" : "変更を申請する"}
              </button>
              <button type="button" className="btn-secondary text-sm" disabled={busy} onClick={() => setOpen(false)}>
                キャンセル
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-secondary text-sm" onClick={() => setOpen(true)}>
            配送先の変更を申請する
          </button>
        )
      )}

      {message && (
        <p className={`text-xs ${message.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>
          {message.text}
        </p>
      )}

      <p className="text-xs text-slate-500">
        ※ なりすまし・不正転売の防止のため、配送先の変更は弊社確認後に反映されます (通常 1〜2 営業日)。
      </p>

      {/* 履歴 */}
      {recentRequests.length > 0 && (
        <details className="text-xs">
          <summary className="text-slate-500 cursor-pointer">過去の申請履歴</summary>
          <ul className="mt-2 space-y-1">
            {recentRequests.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  r.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-700"
                }`}>
                  {r.status === "approved" ? "承認" : "却下"}
                </span>
                <span className="text-slate-600">{formatJST(r.created_at)} — {r.new_value.slice(0, 30)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
