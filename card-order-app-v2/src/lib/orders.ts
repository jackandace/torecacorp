// 発注バリデーションロジック
import type { Product, OrderUnit } from "@/types/database";

export interface OrderValidationResult {
  ok: boolean;
  error?: string;
  qtyInBox: number;
}

/** 発注フォームの数量バリデーション */
export function validateOrderQty(args: {
  product: Pick<Product, "min_order_box" | "ct_to_box" | "planned_qty" | "ordered_qty" | "status" | "flow_type">;
  orderUnit: OrderUnit;
  qty: number;
}): OrderValidationResult {
  const { product, orderUnit, qty } = args;

  if (product.status !== "受付中") {
    return { ok: false, error: "現在この商品は受付停止中です", qtyInBox: 0 };
  }

  if (!Number.isInteger(qty) || qty <= 0) {
    return { ok: false, error: "数量は1以上の整数で入力してください", qtyInBox: 0 };
  }

  if (orderUnit === "BOX" && qty < product.min_order_box) {
    return {
      ok: false,
      error: `BOX単位の最低発注数は${product.min_order_box}BOXです`,
      qtyInBox: qty,
    };
  }
  if (orderUnit === "CT" && qty < 1) {
    return { ok: false, error: "1CT以上で発注してください", qtyInBox: 0 };
  }

  const qtyInBox = orderUnit === "CT" ? qty * product.ct_to_box : qty;

  // カット品(カット可能性あり)は在庫上限の概念が無く「希望BOX数」を受け付ける。
  // 配分品(haibun)のみ planned_qty を在庫上限として残数チェックする。
  if (product.flow_type !== "cut") {
    const available = (product.planned_qty ?? 0) - product.ordered_qty;
    if (qtyInBox > available) {
      return {
        ok: false,
        error: `発注可能数を超えています (残${available}BOX)`,
        qtyInBox,
      };
    }
  }

  return { ok: true, qtyInBox };
}

/** カートの合計金額 (税抜・リベート前) を概算 */
export interface CartLine {
  unitPrice: number;
  listedRate: number;
  qtyInBox: number;
}

export function calcCartSubtotal(lines: CartLine[]): number {
  return lines.reduce(
    (sum, l) => sum + Math.floor(l.unitPrice * l.qtyInBox * l.listedRate),
    0,
  );
}
