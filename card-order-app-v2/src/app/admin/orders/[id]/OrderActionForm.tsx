"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus, ShippingStatus } from "@/types/database";

interface Props {
  orderId: string;
  currentStatus: OrderStatus;
  currentShippingStatus: ShippingStatus;
  requestedQtyBox: number;
  provisionalQty: number | null;
  confirmedQty: number | null;
  flowType: string;
  adminNote: string;
  trackingNumber: string;
  lastUpdatedAt: string;
}

const STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  リクエスト:   ["発注調整中", "仮確定", "キャンセル"],
  発注調整中:   ["仮確定", "キャンセル"],
  仮確定:       ["確定", "キャンセル"],
  確定:         ["キャンセル"],
  キャンセル:   [],
};

export function OrderActionForm(props: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(props.currentStatus);
  const [provQty, setProvQty] = useState<number>(props.provisionalQty ?? props.requestedQtyBox);
  const [confQty, setConfQty] = useState<number>(props.confirmedQty ?? props.provisionalQty ?? props.requestedQtyBox);
  const [adminNote, setAdminNote] = useState(props.adminNote);
  const [shippingStatus, setShippingStatus] = useState<ShippingStatus>(props.currentShippingStatus);
  const [trackingNumber, setTrackingNumber] = useState(props.trackingNumber);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const nextStatuses = STATUS_FLOW[props.currentStatus];
  const isCut = props.flowType === "cut";

  const handleStatusSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        status,
        adminNote,
        lastUpdatedAt: props.lastUpdatedAt,
      };
      if (status === "発注調整中" || status === "仮確定") {
        payload.provisionalQty = provQty;
      }
      if (status === "確定") {
        payload.confirmedQty = confQty;
      }
      const res = await fetch(`/api/orders/${props.orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      setMessage("更新しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleShippingSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/orders/${props.orderId}/shipping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingStatus,
          trackingNumber: trackingNumber || null,
          lastUpdatedAt: props.lastUpdatedAt,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMessage("発送ステータスを更新しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">ステータス更新</h2>
        <div className="text-xs text-slate-500">
          現在: <span className="font-medium text-slate-800">{props.currentStatus}</span>
          {" / フロー: "}
          {isCut ? "カット割" : "配分確定品"}
        </div>

        {nextStatuses.length === 0 ? (
          <p className="text-sm text-slate-500">このステータスから遷移できません</p>
        ) : (
          <>
            <div>
              <label className="block text-xs text-slate-600 mb-1">次のステータス</label>
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
              >
                <option value={props.currentStatus}>{props.currentStatus} (現状維持)</option>
                {nextStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {(status === "発注調整中" || status === "仮確定") && (
              <div>
                <label className="block text-xs text-slate-600 mb-1">
                  {isCut ? "配分数量 (仮確定 BOX)" : "仮確定数量 (BOX)"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={props.requestedQtyBox}
                  className="input"
                  value={provQty}
                  onChange={(e) => setProvQty(parseInt(e.target.value || "0", 10))}
                />
                <p className="text-xs text-slate-500 mt-1">希望: {props.requestedQtyBox} BOX</p>
              </div>
            )}

            {status === "確定" && (
              <div>
                <label className="block text-xs text-slate-600 mb-1">確定数量 (BOX)</label>
                <input
                  type="number"
                  min={0}
                  max={props.requestedQtyBox}
                  className="input"
                  value={confQty}
                  onChange={(e) => setConfQty(parseInt(e.target.value || "0", 10))}
                />
                <p className="text-xs text-slate-500 mt-1">
                  仮確定: {props.provisionalQty ?? "—"} BOX
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-600 mb-1">管理メモ</label>
              <textarea
                className="input"
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
              />
            </div>

            <button type="button" className="btn-primary w-full" disabled={busy} onClick={handleStatusSubmit}>
              {busy ? "更新中…" : `${status} に更新`}
            </button>
          </>
        )}
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="font-semibold">発送ステータス</h2>
        <div className="text-xs text-slate-500">
          現在: <span className="font-medium text-slate-800">{props.currentShippingStatus}</span>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">発送ステータス</label>
          <select
            className="input"
            value={shippingStatus}
            onChange={(e) => setShippingStatus(e.target.value as ShippingStatus)}
          >
            {(["未出荷", "準備中", "出荷済", "配送中", "完了"] as ShippingStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">追跡番号</label>
          <input
            type="text"
            className="input"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
        </div>
        <button type="button" className="btn-secondary w-full" disabled={busy} onClick={handleShippingSubmit}>
          発送情報を更新
        </button>
      </div>

      {message && <p className="text-xs px-1">{message}</p>}
    </>
  );
}
