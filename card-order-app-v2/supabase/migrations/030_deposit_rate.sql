-- =========================================================================
-- 030_deposit_rate.sql
-- 保証金(前受金)請求書に適用率を保存する
--
-- 背景: 2026-07-28 保証金率のデフォルトを 50% → 30% に変更。
--   これまで率は invoices に保存されず、明細の line_total(計算後の保証金額)
--   からしか読み取れなかったため、請求詳細・PDF で「満額 × 率 = 保証金額」
--   の内訳を表示できなかった。発行時の率を deposit_rate に永続化する。
-- Supabase SQL Editor で手動実行。
-- =========================================================================

-- 1. invoices.deposit_rate (deposit のみ使用。0 < rate <= 1)
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deposit_rate numeric NULL
    CHECK (deposit_rate IS NULL OR (deposit_rate > 0 AND deposit_rate <= 1));

COMMENT ON COLUMN public.invoices.deposit_rate IS
  '保証金(前受金)の適用率。2026-07-28 以降の発行分は必須で保存 (既定30%)。過去分は下のバックフィルで推定値を補完。';

-- 2. 既存の保証金請求書をバックフィル
--    率 = 保証金額合計 ÷ 満額合計(定価×希望BOX×掛け率) を 1% 単位に丸めて推定
UPDATE public.invoices i
SET deposit_rate = sub.rate
FROM (
  SELECT
    ii.invoice_id,
    ROUND(
      SUM(ii.line_total)::numeric
      / NULLIF(SUM(o.unit_price * COALESCE(o.requested_qty_box, o.requested_qty) * o.listed_rate), 0),
      2
    ) AS rate
  FROM public.invoice_items ii
  JOIN public.orders o ON o.id = ii.order_id
  GROUP BY ii.invoice_id
) sub
WHERE i.id = sub.invoice_id
  AND i.invoice_kind = 'deposit'
  AND i.deposit_rate IS NULL
  AND sub.rate > 0 AND sub.rate <= 1;
