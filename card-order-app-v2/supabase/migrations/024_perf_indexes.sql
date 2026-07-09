-- =========================================================================
-- 024_perf_indexes.sql
-- パフォーマンス索引の補完 (長期運用でのクエリ高速化)
-- Supabase SQL Editor で手動実行。
-- =========================================================================

-- migration 020 で invoice_items(order_id) 単独の一意索引を
-- (invoice_id, order_id) に置き換えたため、order_id 単独での検索
-- (保証金の重複チェック / 請求対象発注の抽出 / PDF生成) に索引が無い状態だった。
CREATE INDEX IF NOT EXISTS idx_invoice_items_order
  ON public.invoice_items(order_id);

-- 顧客一覧のページング/並び (登録日降順)
CREATE INDEX IF NOT EXISTS idx_shops_created
  ON public.shops(created_at DESC)
  WHERE deleted_at IS NULL;

-- ショップ別の発注取得 (発注管理・請求対象抽出・マイページ)
CREATE INDEX IF NOT EXISTS idx_orders_shop_status
  ON public.orders(shop_id, status)
  WHERE deleted_at IS NULL;

-- 請求書のショップ別取得 (マイページ・詳細)
CREATE INDEX IF NOT EXISTS idx_invoices_shop
  ON public.invoices(shop_id)
  WHERE deleted_at IS NULL;
