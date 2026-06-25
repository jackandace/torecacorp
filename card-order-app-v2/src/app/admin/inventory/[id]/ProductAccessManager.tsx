"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AccessRow {
  shopId: string;
  companyName: string;
}
interface ShopOption {
  id: string;
  company_name: string;
}

export function ProductAccessManager({
  productId,
  initialAccess,
  shops,
}: {
  productId: string;
  initialAccess: AccessRow[];
  shops: ShopOption[];
}) {
  const router = useRouter();
  const [access, setAccess] = useState<AccessRow[]>(initialAccess);
  const [selected, setSelected] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const grantedIds = new Set(access.map((a) => a.shopId));
  const candidates = shops.filter((s) => !grantedIds.has(s.id));

  const add = async () => {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: selected, notify }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "追加失敗");
      const shop = shops.find((s) => s.id === selected);
      setAccess((prev) => [...prev, { shopId: selected, companyName: shop?.company_name ?? "—" }]);
      setSelected("");
      setMessage(notify ? "追加し、案内メールを送信しました" : "追加しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (shopId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "解除失敗");
      setAccess((prev) => prev.filter((a) => a.shopId !== shopId));
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5 space-y-3">
      <div>
        <h2 className="font-semibold">個別指名公開</h2>
        <p className="text-xs text-slate-500 mt-1">
          指名したショップ<strong>のみ</strong>に表示します（最低表示ランクより優先）。再配分品など数量限定の優良顧客向け案内に使用。
          指名が0件なら通常のランク判定で表示されます。
        </p>
      </div>

      {access.length > 0 ? (
        <ul className="space-y-1">
          {access.map((a) => (
            <li key={a.shopId} className="flex items-center justify-between text-sm border border-slate-100 rounded px-3 py-1.5">
              <span>{a.companyName}</span>
              <button type="button" className="text-xs text-red-600 hover:underline" disabled={busy} onClick={() => remove(a.shopId)}>
                解除
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-400">指名なし（ランク判定で表示）</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <select className="input flex-1 min-w-[180px]" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">ショップを選択…</option>
          {candidates.map((s) => (
            <option key={s.id} value={s.id}>{s.company_name}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          案内メールを送る
        </label>
        <button type="button" className="btn-primary text-sm" disabled={busy || !selected} onClick={add}>
          指名追加
        </button>
      </div>
      {message && <p className="text-xs text-slate-600">{message}</p>}
    </section>
  );
}
