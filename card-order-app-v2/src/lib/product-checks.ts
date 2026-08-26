// 商品の公開前チェック (設定漏れ検知 → 金銭トラブル防止)
//
// errors  … 公開をブロックすべき致命的な設定漏れ (価格・掛け率など金額に直結)
// warnings… 公開は可能だが確認推奨 (締切・カートン情報など)
import type { Product } from "@/types/database";

export type ProductCheckInput = Pick<
  Product,
  | "title" | "price" | "actual_rate" | "ct_to_box" | "min_order_box"
  | "planned_qty" | "flow_type" | "order_deadline" | "jan_code"
  | "carton_delivery" | "master_carton_box"
>;

export interface ProductCheckResult {
  errors: string[];
  warnings: string[];
  ok: boolean; // errors が無い
}

export function checkProductPublishable(p: Partial<ProductCheckInput>): ProductCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!p.title || !p.title.trim()) errors.push("商品名が未設定です");
  if (p.price == null || p.price <= 0) errors.push("定価が未設定(0円)です");
  if (p.actual_rate == null || p.actual_rate <= 0) errors.push("実掛け率が未設定(0)です");
  if (p.actual_rate != null && p.actual_rate > 1) errors.push("掛け率が1(100%)を超えています");
  if (p.ct_to_box == null || p.ct_to_box < 1) errors.push("カートン(CT)あたりBOX数が不正です");
  if (p.min_order_box == null || p.min_order_box < 1) errors.push("最低発注BOX数が不正です");

  // 配分品は在庫(planned_qty)が必要。カット品は希望BOX受付なので不要
  if (p.flow_type === "haibun" && (p.planned_qty == null || p.planned_qty <= 0)) {
    errors.push("配分品の発注可能数(在庫)が0です");
  }

  // 配分数より最低発注数が大きいと誰も発注できない (取込既定12のまま少数配分を公開する事故の検知)
  if (
    p.flow_type === "haibun" &&
    p.planned_qty != null && p.planned_qty > 0 &&
    p.min_order_box != null && p.min_order_box > p.planned_qty
  ) {
    warnings.push(
      `最低発注数(${p.min_order_box}BOX)が発注可能数(${p.planned_qty}BOX)を超えており、このままでは誰も発注できません。最低発注数を下げてください`,
    );
  }

  // 推奨 (warnings)
  if (!p.order_deadline) warnings.push("発注締切が未設定です(締切なしで公開されます)");
  if (!p.jan_code) warnings.push("JANコードが未設定です");
  if (p.carton_delivery && (p.master_carton_box == null || p.master_carton_box <= 0)) {
    warnings.push("カートン単位配送ですがマスターカートンBOX数が未設定です");
  }

  return { errors, warnings, ok: errors.length === 0 };
}
