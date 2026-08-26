"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Product, Shop, OrderUnit, ProductCategory } from "@/types/database";
import { getListedRate, formatRate, formatYen } from "@/lib/rebate";
import { validateOrderQty, calcCartSubtotal } from "@/lib/orders";
import { orderCutoffDate } from "@/lib/dates";

interface CartItem {
  product: Product;
  unit: OrderUnit;
  qty: number;
  qtyInBox: number;
}

interface Props {
  products: Product[];
  shop: Shop | null;
  /** 商品ID → このショップが発注中(未確定)のBOX数。配分品のショップ別上限判定に使う */
  pendingByProduct?: Record<string, number>;
}

type CategoryFilter = "all" | ProductCategory;
type SortKey = "deadline" | "price_asc" | "price_desc" | "newest";

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  pokemon:  "ポケモン",
  onepiece: "ワンピース",
  other:    "その他",
};

export function OrderForm({ products: initialProducts, shop, pendingByProduct = {} }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false); // 送信完了モーダル
  const [message, setMessage] = useState<string | null>(null);

  // フィルタ・検索・ソート
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("deadline");

  // 表示形式 (リスト / グリッド) — ブラウザに記憶
  const [view, setView] = useState<"list" | "grid">("list");
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("order_view") : null;
    if (saved === "grid" || saved === "list") setView(saved);
  }, []);
  const changeView = (v: "list" | "grid") => {
    setView(v);
    try { window.localStorage.setItem("order_view", v); } catch { /* ignore */ }
  };

  // リアルタイム在庫: Supabase Realtime で products の変更を購読し、
  // 他ショップの発注確定・管理者の在庫更新を画面リロードなしで反映する。
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [live, setLive] = useState(false);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("products-stock")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string }).id;
            if (oldId) setProducts((prev) => prev.filter((p) => p.id !== oldId));
            return;
          }
          const next = payload.new as Product;
          setProducts((prev) => {
            const exists = prev.some((p) => p.id === next.id);
            // 非公開化・受付停止・論理削除されたら一覧から除去
            if (!next.is_visible || next.status !== "受付中" || next.deleted_at) {
              return prev.filter((p) => p.id !== next.id);
            }
            if (exists) return prev.map((p) => (p.id === next.id ? { ...p, ...next } : p));
            // 新規公開された商品はランク別/個別指名の表示判定をサーバ側で行う必要があり、
            // クライアントでは可否を判定できないため一覧追加しない(次回再読込で反映)。
            return prev;
          });
        },
      )
      .subscribe((status) => setLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const subtotal = useMemo(
    () =>
      calcCartSubtotal(
        cart.map((c) => ({
          unitPrice: c.product.price ?? 0,
          listedRate: getListedRate(c.product, shop),
          qtyInBox: c.qtyInBox,
        })),
      ),
    [cart, shop],
  );

  // リアルタイム在庫とカートの突合: カート投入後に在庫が減って足りなくなった商品を警告
  const stockConflicts = useMemo(() => {
    const conflicts = new Map<string, number>(); // productId → 現在の残数
    for (const item of cart) {
      const current = products.find((p) => p.id === item.product.id);
      if (!current) {
        conflicts.set(item.product.id, 0); // 受付終了
        continue;
      }
      // カット品は在庫上限が無い(希望BOX受付)ため在庫競合チェックの対象外
      if (current.flow_type === "cut") continue;
      const available = (current.planned_qty ?? 0) - current.ordered_qty;
      if (available < item.qtyInBox) conflicts.set(item.product.id, available);
    }
    return conflicts;
  }, [cart, products]);

  // 表示用商品リスト (フィルタ + ソート)
  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const todayStr = new Date().toISOString().slice(0, 10);
    const filtered = products.filter((p) => {
      // 実効締切(問屋発注期限の3日前)が過ぎた商品は自動的に非表示
      const cutoff = orderCutoffDate(p.order_deadline);
      if (cutoff && cutoff < todayStr) return false;
      if (category !== "all" && p.category !== category) return false;
      if (q) {
        const hay = `${p.series ?? ""} ${p.title} ${p.full_name ?? ""} ${p.model_number ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...filtered];
    switch (sort) {
      case "deadline":
        // 締切日の昇順 (締切なしは最後)。同日中は商品名順
        sorted.sort((a, b) => {
          if (!a.order_deadline && !b.order_deadline) return a.title.localeCompare(b.title, "ja");
          if (!a.order_deadline) return 1;
          if (!b.order_deadline) return -1;
          const cmp = a.order_deadline.localeCompare(b.order_deadline);
          return cmp !== 0 ? cmp : a.title.localeCompare(b.title, "ja");
        });
        break;
      case "price_asc":
        sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price_desc":
        sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "newest":
        // 掲載日時 (created_at) の降順。Excel 一括取込分は同時刻になるため、
        // 同時刻の場合は締切が近い順 → 商品名順で安定ソート
        sorted.sort((a, b) => {
          const cmp = b.created_at.localeCompare(a.created_at);
          if (cmp !== 0) return cmp;
          const da = a.order_deadline ?? "9999-12-31";
          const db = b.order_deadline ?? "9999-12-31";
          const dcmp = da.localeCompare(db);
          return dcmp !== 0 ? dcmp : a.title.localeCompare(b.title, "ja");
        });
        break;
    }
    return sorted;
  }, [products, category, query, sort]);

  const categoryCounts = useMemo(() => {
    const counts = { all: products.length, pokemon: 0, onepiece: 0, other: 0 };
    for (const p of products) counts[p.category]++;
    return counts;
  }, [products]);

  const addToCart = (product: Product, unit: OrderUnit, qtyRaw: number) => {
    const result = validateOrderQty({
      product,
      orderUnit: unit,
      qty: qtyRaw,
      shopPendingBox: pendingByProduct[product.id] ?? 0,
    });
    if (!result.ok) {
      setMessage(result.error ?? "入力に誤りがあります");
      return;
    }
    setMessage(null);
    setCart((prev) => [
      ...prev.filter((c) => c.product.id !== product.id),
      { product, unit, qty: qtyRaw, qtyInBox: result.qtyInBox },
    ]);
  };

  const removeItem = (productId: string) =>
    setCart((prev) => prev.filter((c) => c.product.id !== productId));

  const handleSubmit = async () => {
    if (!consent) {
      setMessage("免責事項への同意が必要です");
      return;
    }
    if (cart.length === 0) {
      setMessage("カートが空です");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            productId: c.product.id,
            unit: c.unit,
            qty: c.qty,
          })),
          consentAgreedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCart([]);
      setConsent(false);
      setConfirmOpen(false);
      setCompleteOpen(true); // 送信完了モーダルを表示
    } catch (e) {
      setMessage(`送信に失敗しました: ${e instanceof Error ? e.message : "不明なエラー"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 商品リスト */}
      <div className="lg:col-span-2 space-y-4">
        {/* 検索 + カテゴリタブ + ソート */}
        <div className="card p-4 space-y-3">
          <div className="relative">
            <input
              type="search"
              placeholder="商品名・型番で検索"
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap gap-1 text-xs">
              <TabButton active={category === "all"}      onClick={() => setCategory("all")}>
                すべて ({categoryCounts.all})
              </TabButton>
              <TabButton active={category === "pokemon"}  onClick={() => setCategory("pokemon")}>
                ポケモン ({categoryCounts.pokemon})
              </TabButton>
              <TabButton active={category === "onepiece"} onClick={() => setCategory("onepiece")}>
                ワンピース ({categoryCounts.onepiece})
              </TabButton>
              <TabButton active={category === "other"}    onClick={() => setCategory("other")}>
                その他 ({categoryCounts.other})
              </TabButton>
            </div>
            <div className="flex items-center gap-2">
              {/* 表示形式 切替 */}
              <div className="flex rounded border border-slate-300 overflow-hidden" role="group" aria-label="表示形式">
                <button
                  type="button"
                  aria-pressed={view === "list"}
                  onClick={() => changeView("list")}
                  className={`px-2 py-1 ${view === "list" ? "bg-brand-600 text-white" : "bg-white text-slate-600"}`}
                  title="リスト表示"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button
                  type="button"
                  aria-pressed={view === "grid"}
                  onClick={() => changeView("grid")}
                  className={`px-2 py-1 border-l border-slate-300 ${view === "grid" ? "bg-brand-600 text-white" : "bg-white text-slate-600"}`}
                  title="グリッド表示"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
              </div>
              <select
                className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
              >
                <option value="deadline">発注締切が近い順</option>
                <option value="newest">掲載が新しい順</option>
                <option value="price_asc">定価が安い順</option>
                <option value="price_desc">定価が高い順</option>
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span>{visibleProducts.length} 件表示中 / 全 {products.length} 件</span>
            {live && (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                在庫リアルタイム更新中
              </span>
            )}
          </p>
        </div>

        {visibleProducts.length === 0 && (
          <div className="card p-6 text-center text-slate-500">
            {products.length === 0 ? "現在受付中の商品はありません。" : "条件に一致する商品がありません。"}
          </div>
        )}
        <div className={view === "grid" ? "grid grid-cols-2 xl:grid-cols-3 gap-3" : "space-y-3"}>
          {visibleProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              listedRate={getListedRate(p, shop)}
              onAdd={addToCart}
              compact={view === "grid"}
              pendingBox={pendingByProduct[p.id] ?? 0}
            />
          ))}
        </div>
      </div>

      {/* カート */}
      <aside className="card p-5 h-fit lg:sticky lg:top-4 space-y-4">
        <h2 className="font-semibold">カート ({cart.length})</h2>
        {cart.length === 0 ? (
          <p className="text-sm text-slate-500">カートは空です</p>
        ) : (
          <ul className="space-y-3">
            {cart.map((c) => {
              const conflict = stockConflicts.get(c.product.id);
              return (
                <li key={c.product.id} className="text-sm border-b border-slate-100 pb-2">
                  <div className="font-medium">{c.product.title}</div>
                  <div className="text-slate-500">
                    {c.qty}{c.unit} = {c.qtyInBox} BOX
                  </div>
                  {conflict !== undefined && (
                    <div className="text-xs text-rose-700 bg-rose-50 rounded px-2 py-1 mt-1">
                      ⚠ 在庫が変動しました (残 {conflict} BOX)。数量を調整してください。
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-slate-600">
                      {formatYen(Math.floor((c.product.price ?? 0) * c.qtyInBox * getListedRate(c.product, shop)))}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:underline"
                      onClick={() => removeItem(c.product.id)}
                    >
                      削除
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex justify-between text-sm">
          <span>小計 (税抜・リベート前)</span>
          <span className="font-bold">{formatYen(subtotal)}</span>
        </div>
        <label className="flex items-start gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5"
          />
          <span>免責事項・キャンセル不可規約に同意します。</span>
        </label>
        <button
          type="button"
          className="btn-primary w-full"
          disabled={cart.length === 0 || !consent || submitting || stockConflicts.size > 0}
          onClick={() => setConfirmOpen(true)}
        >
          {stockConflicts.size > 0 ? "在庫変動あり (数量を調整してください)" : "リクエスト送信"}
        </button>
        {message && <p className="text-xs text-slate-600">{message}</p>}
      </aside>

      {/* 送信完了モーダル */}
      {completeOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-8 max-w-md w-full text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">発注リクエストを送信しました</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              担当者が内容を確認のうえ、数量確定のご連絡をいたします。<br />
              進捗は発注履歴からいつでもご確認いただけます。
            </p>
            <div className="space-y-2 pt-2">
              <a href="/mypage" className="btn-primary w-full block text-center">
                発注履歴を確認する
              </a>
              <button
                type="button"
                className="btn-secondary w-full"
                onClick={() => setCompleteOpen(false)}
              >
                続けて発注する
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full space-y-4">
            <h3 className="font-bold">発注内容の最終確認</h3>
            <ul className="text-sm space-y-1">
              {cart.map((c) => (
                <li key={c.product.id} className="flex justify-between">
                  <span>{c.product.title}</span>
                  <span>{c.qty}{c.unit} ({c.qtyInBox}BOX)</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-sm border-t pt-2">
              <span>小計</span>
              <span className="font-bold">{formatYen(subtotal)}</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
                戻る
              </button>
              <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "送信中…" : "送信する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full border transition ${
        active
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

/** YYYY-MM-DD 形式の日付から残日数を計算 */
function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ deadline }: { deadline: string | null }) {
  // ショップ表示の締切は「問屋発注期限の3日前」
  const cutoff = orderCutoffDate(deadline);
  const days = daysUntil(cutoff);
  if (days == null) return null;
  let tone = "bg-slate-100 text-slate-700";
  let label = `締切 ${cutoff}`;
  if (days < 0) {
    tone = "bg-rose-100 text-rose-700";
    label = `締切超過 (${Math.abs(days)} 日前)`;
  } else if (days === 0) {
    tone = "bg-rose-100 text-rose-700";
    label = "本日締切";
  } else if (days <= 3) {
    tone = "bg-amber-100 text-amber-800";
    label = `あと ${days} 日`;
  } else if (days <= 7) {
    tone = "bg-yellow-50 text-yellow-800 border border-yellow-200";
    label = `あと ${days} 日`;
  } else {
    label = `締切 ${cutoff}`;
  }
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded ${tone}`}>
      {label}
    </span>
  );
}

function ProductCard({
  product,
  listedRate,
  onAdd,
  compact = false,
  pendingBox = 0,
}: {
  product: Product;
  listedRate: number;
  onAdd: (p: Product, unit: OrderUnit, qty: number) => void;
  compact?: boolean;
  /** このショップが発注中(未確定)のBOX数 */
  pendingBox?: number;
}) {
  // 単位ごとの初期数量: BOX=1カートン分(=ct_to_box、最低発注数を下回らない) / CT=1
  const defaultBox = Math.max(product.min_order_box, product.ct_to_box);
  const [unit, setUnit] = useState<OrderUnit>("BOX");
  const [qty, setQty] = useState<number>(defaultBox);
  // 単位切替時に既定数量へ自動セット (12box品→12 / 20box品→20 / CT→1)
  const changeUnit = (u: OrderUnit) => {
    setUnit(u);
    setQty(u === "CT" ? 1 : defaultBox);
  };
  const isCut = product.flow_type === "cut";
  const available = (product.planned_qty ?? 0) - product.ordered_qty;
  // カット品は在庫上限の概念が無く希望BOX数を受け付けるため SOLD OUT にしない
  const soldOut = !isCut && available <= 0;
  // 配分品はショップごとに発注可能数まで。発注中の数量が上限に達したら受付停止表示
  const maxReached = !isCut && !soldOut && pendingBox >= available;
  const flowBadge = isCut ? "カット割" : "配分品";

  return (
    <div className={`card p-3 sm:p-5 relative ${soldOut ? "opacity-60" : ""}`}>
      <div className={compact ? "flex flex-col gap-2" : "flex flex-col sm:flex-row gap-4"}>
        {/* 画像 */}
        <Link href={`/order/${product.id}`} className={compact ? "block" : "sm:w-32 flex-shrink-0"}>
          <div className="relative w-full aspect-square bg-slate-100 rounded overflow-hidden">
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt={product.title}
                fill
                sizes="128px"
                className={`object-contain ${soldOut ? "grayscale" : ""}`}
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs text-center px-2">
                画像なし
              </div>
            )}
            {soldOut && (
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
                <span className="bg-rose-600 text-white text-sm font-bold px-4 py-1.5 rounded -rotate-6 tracking-wider shadow-lg">
                  SOLD OUT
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* 商品情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="badge bg-slate-100 text-slate-700">{flowBadge}</span>
            {soldOut ? (
              <span className="inline-flex items-center text-xs px-2 py-0.5 rounded bg-rose-600 text-white font-bold">
                SOLD OUT
              </span>
            ) : (
              <DeadlineBadge deadline={product.order_deadline} />
            )}
          </div>
          <Link href={`/order/${product.id}`}>
            <h3 className={`font-semibold leading-snug hover:text-brand-700 ${compact ? "text-sm line-clamp-2" : ""}`}>{product.title}</h3>
          </Link>
          {!compact && product.full_name && product.full_name !== product.title && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{product.full_name}</p>
          )}
          {!compact && product.model_number && (
            <p className="text-xs text-slate-500 mt-1">型番: {product.model_number}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
            <span>定価 <span className="font-medium">{formatYen(product.price ?? 0)}</span></span>
            <span className="text-brand-700">案内掛け率 <span className="font-bold">{formatRate(listedRate)}</span></span>
          </div>
          {isCut ? (
            <p className="text-xs mt-1 text-amber-700">
              希望BOX数で受付（カット後に配分確定）。発注時に保証金30%(前受金)、配分確定後に差額精算します。(1CT = {product.ct_to_box} BOX)
            </p>
          ) : (
            <p className={`text-xs mt-1 ${soldOut ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
              {soldOut
                ? "在庫切れ (再入荷時はメールでお知らせします)"
                : `残 ${available} BOX / ${product.planned_qty ?? 0} BOX (1CT = ${product.ct_to_box} BOX)`}
            </p>
          )}
          {!isCut && !soldOut && pendingBox > 0 && (
            <p className={`text-xs mt-1 ${maxReached ? "text-amber-700 font-semibold" : "text-slate-500"}`}>
              {maxReached
                ? `発注可能数までご注文済みです (発注中 ${pendingBox} BOX)。配分確定をお待ちください`
                : `発注中 ${pendingBox} BOX (あと ${available - pendingBox} BOX まで注文できます)`}
            </p>
          )}
          {!compact && product.notes && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.notes}</p>
          )}
          {!compact && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-slate-400">
              {product.carton_delivery && <span className="text-slate-500">📦 カートン単位でお届け</span>}
              {product.jan_code && <span>JAN: {product.jan_code}</span>}
            </div>
          )}
          {!compact && product.release_info && (
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 whitespace-pre-line">{product.release_info}</p>
          )}
        </div>

        {/* 注文操作 (在庫切れ時は全 UI を無効化) */}
        <div className={compact
          ? "flex flex-col gap-2"
          : "flex flex-row sm:flex-col items-end sm:items-stretch gap-2 sm:w-40 flex-shrink-0"}>
          <div className="flex gap-1 text-xs">
            {(["BOX", "CT"] as OrderUnit[]).map((u) => (
              <button
                key={u}
                type="button"
                disabled={soldOut || maxReached}
                className={`px-2 py-1 rounded border ${
                  soldOut || maxReached
                    ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                    : unit === u
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white border-slate-300"
                }`}
                onClick={() => changeUnit(u)}
              >
                {u}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            disabled={soldOut || maxReached}
            className="input w-24 sm:w-full text-right disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value || "0", 10))}
          />
          <button
            type="button"
            className={`text-sm whitespace-nowrap ${
              soldOut || maxReached
                ? "inline-flex items-center justify-center rounded-md bg-slate-200 px-4 py-2 font-semibold text-slate-400 cursor-not-allowed"
                : "btn-primary"
            }`}
            disabled={soldOut || maxReached}
            onClick={() => onAdd(product, unit, qty)}
          >
            {soldOut ? "売り切れ" : maxReached ? "ご注文上限" : "カートに追加"}
          </button>
        </div>
      </div>
    </div>
  );
}
