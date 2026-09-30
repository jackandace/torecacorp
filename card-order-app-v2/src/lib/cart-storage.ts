// 発注カートのブラウザ保存 (同じ端末・同じブラウザの中で保持)
//
// ページ移動・再読み込みでカートが消えないよう localStorage に「商品ID・単位・数量」だけを保存する。
// 商品情報 (価格・在庫・受付状態) は保存しない — 発注ページで最新の商品データと突き合わせて復元する。
// ショップごとにキーを分け、同じブラウザで別アカウントにログインしてもカートが混ざらないようにする。
import type { OrderUnit } from "@/types/database";

export interface StoredCartLine {
  productId: string;
  unit: OrderUnit;
  qty: number;
  title: string;      // 受付終了などで商品が取れなくなったときの表示用
}

export const CART_EVENT = "trecacorp:cart-change";
const keyOf = (shopId: string) => `trecacorp_cart_v1:${shopId}`;

function isLine(v: unknown): v is StoredCartLine {
  const o = v as StoredCartLine;
  return !!o && typeof o.productId === "string" && (o.unit === "BOX" || o.unit === "CT")
    && Number.isInteger(o.qty) && o.qty > 0 && typeof o.title === "string";
}

export function loadCart(shopId: string): StoredCartLine[] {
  try {
    const raw = window.localStorage.getItem(keyOf(shopId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter(isLine) : [];
  } catch {
    return [];
  }
}

export function saveCart(shopId: string, lines: StoredCartLine[]): void {
  try {
    if (lines.length === 0) window.localStorage.removeItem(keyOf(shopId));
    else window.localStorage.setItem(keyOf(shopId), JSON.stringify(lines));
    window.dispatchEvent(new CustomEvent(CART_EVENT));
  } catch {
    // プライベートモード等で保存できない場合はページ内のカートだけで動く
  }
}

/** 1商品を追加 (同じ商品は数量を置き換え)。追加後の行数を返す */
export function upsertCartLine(shopId: string, line: StoredCartLine): number {
  const next = [...loadCart(shopId).filter((l) => l.productId !== line.productId), line];
  saveCart(shopId, next);
  return next.length;
}
