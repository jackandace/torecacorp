-- =========================================================================
-- 023_invoice_handling_fee.sql
-- 請求書に決済手数料(税抜)を追加。
--   fee_amount = 商品代金(税抜) × 2% (税込では実質2.2%)
--   課税対象額 = 小計 - リベート + fee_amount として消費税・合計に反映済み。
-- Supabase SQL Editor で手動実行。
-- =========================================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS fee_amount integer NOT NULL DEFAULT 0 CHECK (fee_amount >= 0);

COMMENT ON COLUMN public.invoices.fee_amount IS '決済手数料(税抜)。商品代金税抜×2%。消費税を乗せて実質2.2%';
