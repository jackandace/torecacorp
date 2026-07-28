-- 030_product_deposit_rate.sql : 保証金率を商品(タイトル)ごとに設定可能に
-- null = 既定(30%・2026-07-28に50%から変更)。0.5 等で個別指定。

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS deposit_rate numeric;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_deposit_rate_chk;
ALTER TABLE public.products
  ADD CONSTRAINT products_deposit_rate_chk
  CHECK (deposit_rate IS NULL OR (deposit_rate > 0 AND deposit_rate <= 1));
