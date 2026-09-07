"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** 承認待ち商品の操作: 編集 / 承認して公開 / 削除(差し戻し) */
export function ApproveButtons({ productId, isTest }: { productId: string; isTest: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function approve() {
    if (!confirm("この商品を承認してショップに公開します。掛け率・価格は設定済みですか？")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/products/${productId}/approve`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = Array.isArray(json.details) ? `: ${json.details.join(" / ")}` : "";
        throw new Error((json.error ?? "承認に失敗しました") + detail);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "承認に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("この登録を削除します (問屋には連絡されません)。よろしいですか？")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "削除に失敗しました");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "削除に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch sm:items-end gap-1.5 shrink-0">
      <div className="flex gap-2">
        <Link href={`/admin/inventory/${productId}`} className="btn-secondary text-xs">確認・編集</Link>
        {isTest ? (
          <button type="button" className="text-xs rounded-md bg-slate-200 text-slate-400 px-3 py-2 font-semibold cursor-not-allowed" disabled
            title="テスト問屋の登録データは公開できません">
            承認不可 (TEST)
          </button>
        ) : (
          <button type="button" className="btn-primary text-xs" disabled={busy} onClick={approve}>
            {busy ? "処理中…" : "承認して公開"}
          </button>
        )}
        <button type="button" className="text-xs text-rose-600 underline" disabled={busy} onClick={remove}>削除</button>
      </div>
      {err && <p className="text-xs text-rose-600 max-w-[280px] text-right">{err}</p>}
    </div>
  );
}
