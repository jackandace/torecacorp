"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductCategory, ProductStatus, FlowType, RankCode } from "@/types/database";
import { formatRate } from "@/lib/rebate";
import { RANK_LABEL, RANK_ORDER } from "@/constants/ranks";
import { checkProductPublishable } from "@/lib/product-checks";

export function ProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  const [series, setSeries] = useState(product.series ?? "");
  const [title, setTitle] = useState(product.title);
  const [fullName, setFullName] = useState(product.full_name ?? "");
  const [modelNumber, setModelNumber] = useState(product.model_number ?? "");
  const [category, setCategory] = useState<ProductCategory>(product.category);
  const [actualRate, setActualRate] = useState(product.actual_rate);
  const [rateMarkup, setRateMarkup] = useState(product.rate_markup);
  const [price, setPrice] = useState(product.price ?? 0);
  const [plannedQty, setPlannedQty] = useState(product.planned_qty ?? 0);
  const [ctToBox, setCtToBox] = useState(product.ct_to_box);
  const [minOrderBox, setMinOrderBox] = useState(product.min_order_box);
  const [flowType, setFlowType] = useState<FlowType>(product.flow_type);
  const [cutType, setCutType] = useState(product.cut_type ?? "");
  const [isVisible, setIsVisible] = useState(product.is_visible);
  const [isApproved, setIsApproved] = useState(product.is_approved);
  const [status, setStatus] = useState<ProductStatus>(product.status);
  const [orderDeadline, setOrderDeadline] = useState(product.order_deadline ?? "");
  const [minRank, setMinRank] = useState<RankCode | "">(product.min_rank ?? "");
  const [janCode, setJanCode] = useState(product.jan_code ?? "");
  const [releaseInfo, setReleaseInfo] = useState(product.release_info ?? "");
  const [cartonDelivery, setCartonDelivery] = useState(product.carton_delivery ?? false);
  const [masterCartonBox, setMasterCartonBox] = useState(product.master_carton_box ?? 0);
  const [notes, setNotes] = useState(product.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Web からの発売情報/JAN 取得補助
  const [lookupUrl, setLookupUrl] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string | null>(null);

  const runLookup = async () => {
    if (!lookupUrl.trim()) return;
    setLookupBusy(true);
    setLookupMsg(null);
    try {
      const res = await fetch(`/api/products/${product.id}/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: lookupUrl.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "取得失敗");
      if (json.jan && !janCode) setJanCode(json.jan);
      const parts = [json.title, json.releaseDate ? `発売: ${json.releaseDate}` : "", json.description]
        .filter(Boolean)
        .join("\n");
      if (parts) setReleaseInfo((prev) => (prev ? prev : parts));
      setLookupMsg(
        `取得: JAN=${json.jan ?? "—"} / 発売=${json.releaseDate ?? "—"}。内容を確認して保存してください`,
      );
    } catch (e) {
      setLookupMsg(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setLookupBusy(false);
    }
  };

  const handleSubmit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series: series || null,
          title,
          fullName: fullName || null,
          modelNumber: modelNumber || null,
          category,
          actualRate,
          rateMarkup,
          price,
          plannedQty,
          ctToBox,
          minOrderBox,
          flowType,
          cutType: cutType || null,
          isVisible,
          isApproved,
          status,
          orderDeadline: orderDeadline || null,
          minRank: minRank || null,
          janCode: janCode || null,
          releaseInfo: releaseInfo || null,
          cartonDelivery,
          masterCartonBox: masterCartonBox > 0 ? masterCartonBox : null,
          notes: notes || null,
          lastUpdatedAt: product.updated_at,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(json.checkErrors) && json.checkErrors.length
          ? `: ${json.checkErrors.join(" / ")}`
          : "";
        throw new Error((json.error ?? "更新失敗") + detail);
      }
      setMessage("保存しました");
      router.refresh();
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この商品を論理削除しますか？")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/admin/inventory");
    } catch (e) {
      setMessage(`失敗: ${e instanceof Error ? e.message : "不明"}`);
      setBusy(false);
    }
  };

  const listedPreview = actualRate + rateMarkup;

  const check = checkProductPublishable({
    title,
    price,
    actual_rate: actualRate,
    ct_to_box: ctToBox,
    min_order_box: minOrderBox,
    planned_qty: plannedQty,
    flow_type: flowType,
    order_deadline: orderDeadline || null,
    jan_code: janCode || null,
    carton_delivery: cartonDelivery,
    master_carton_box: masterCartonBox > 0 ? masterCartonBox : null,
  });

  return (
    <section className="card p-5 space-y-4">
      <h2 className="font-semibold">商品情報</h2>

      {/* 公開前チェッカー */}
      {(check.errors.length > 0 || check.warnings.length > 0) && (
        <div className={`rounded-lg border p-3 text-xs space-y-1 ${check.ok ? "border-amber-200 bg-amber-50" : "border-rose-200 bg-rose-50"}`}>
          <div className="font-semibold">
            {check.ok ? "⚠ 公開前の確認事項" : "🚫 公開できない設定漏れがあります(金額に直結)"}
          </div>
          {check.errors.map((e, i) => <div key={`e${i}`} className="text-rose-700">・{e}</div>)}
          {check.warnings.map((w, i) => <div key={`w${i}`} className="text-amber-700">・{w}</div>)}
          {!check.ok && <div className="text-rose-600 mt-1">※ エラーを解消しないと「ショップに公開する」で保存できません。</div>}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <label className="block text-xs text-slate-600 mb-1">シリーズ (ゲームタイトル)</label>
          <input className="input" placeholder="ゼクス Z/X / ポケモンカード 等" value={series} onChange={(e) => setSeries(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">商品名 *</label>
          <input className="input" placeholder="強化拡張パック 等" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">フル商品名 (オプション・長い正式名称)</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">型番</label>
          <input className="input" value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">カテゴリ</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
            <option value="pokemon">ポケモン</option>
            <option value="onepiece">ワンピース</option>
            <option value="other">その他</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">実掛け率 (0〜1)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={actualRate}
            onChange={(e) => setActualRate(parseFloat(e.target.value || "0"))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">上乗せ率 (0〜1)</label>
          <input
            className="input"
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={rateMarkup}
            onChange={(e) => setRateMarkup(parseFloat(e.target.value || "0"))}
          />
          <p className="text-xs text-slate-500 mt-1">案内掛け率 = {formatRate(listedPreview)}</p>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">定価 (円)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(parseInt(e.target.value || "0", 10))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">発注可能数 (BOX)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={plannedQty}
            onChange={(e) => setPlannedQty(parseInt(e.target.value || "0", 10))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">カートン(CT)あたり BOX 数 (12 / 20 等)</label>
          <input
            className="input"
            type="number"
            min={1}
            value={ctToBox}
            onChange={(e) => setCtToBox(parseInt(e.target.value || "1", 10))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">BOX 単位最低発注数</label>
          <input
            className="input"
            type="number"
            min={1}
            value={minOrderBox}
            onChange={(e) => setMinOrderBox(parseInt(e.target.value || "1", 10))}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">フロー</label>
          <select className="input" value={flowType} onChange={(e) => setFlowType(e.target.value as FlowType)}>
            <option value="haibun">配分確定品</option>
            <option value="cut">カット割</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">カット種別 (任意ラベル)</label>
          <input className="input" value={cutType} onChange={(e) => setCutType(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">受付状態</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
            <option value="受付中">受付中</option>
            <option value="受付停止">受付停止</option>
            <option value="終了">終了</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">発注締切</label>
          <input
            className="input"
            type="date"
            value={orderDeadline}
            onChange={(e) => setOrderDeadline(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">最低表示ランク (再配分品の限定公開)</label>
          <select className="input" value={minRank} onChange={(e) => setMinRank(e.target.value as RankCode | "")}>
            <option value="">制限なし (全ランクに表示)</option>
            {[...RANK_ORDER].reverse().map((r) => (
              <option key={r} value={r}>{RANK_LABEL[r]}以上</option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-1">個別指名がある場合はランクより指名が優先されます</p>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">JANコード</label>
          <input className="input" placeholder="4901234567890" value={janCode} onChange={(e) => setJanCode(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">マスターカートン BOX数 (任意)</label>
          <input
            className="input"
            type="number"
            min={0}
            value={masterCartonBox}
            onChange={(e) => setMasterCartonBox(parseInt(e.target.value || "0", 10))}
          />
        </div>
        <label className="flex items-center gap-2 md:col-span-2">
          <input type="checkbox" checked={cartonDelivery} onChange={(e) => setCartonDelivery(e.target.checked)} />
          <span>マスターカートン/カートン単位で届く (カートンBOX単位で入荷)</span>
        </label>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">メーカー発売情報 (発売日・仕様など)</label>
          <textarea className="input" rows={3} value={releaseInfo} onChange={(e) => setReleaseInfo(e.target.value)} />
          <div className="mt-2 flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 rounded p-2">
            <input
              className="input flex-1 min-w-[220px] text-xs"
              placeholder="メーカー/商品ページのURLを貼り付け → 発売情報・JANを自動取得"
              value={lookupUrl}
              onChange={(e) => setLookupUrl(e.target.value)}
            />
            <button type="button" className="btn-secondary text-xs" disabled={lookupBusy || !lookupUrl.trim()} onClick={runLookup}>
              {lookupBusy ? "取得中…" : "Webから取得"}
            </button>
          </div>
          {lookupMsg && <p className="text-xs text-slate-600 mt-1">{lookupMsg}</p>}
          <p className="text-[11px] text-slate-400 mt-1">※ 取得結果は候補です。内容を確認・修正してから「保存」してください。</p>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-slate-600 mb-1">備考</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
          <span>ショップに公開する</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isApproved} onChange={(e) => setIsApproved(e.target.checked)} />
          <span>承認済み</span>
        </label>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" className="btn-primary" disabled={busy} onClick={handleSubmit}>
            {busy ? "保存中…" : "保存"}
          </button>
          {message && <span className="text-xs">{message}</span>}
        </div>
        <button type="button" className="text-xs text-red-600 hover:underline" disabled={busy} onClick={handleDelete}>
          論理削除
        </button>
      </div>
    </section>
  );
}
