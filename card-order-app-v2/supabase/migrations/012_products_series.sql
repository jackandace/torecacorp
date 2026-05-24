-- =========================================================================
-- 012_products_series.sql
-- 商品に series (ゲームシリーズ名・タイトル) を追加し、既存データを移行
--
-- これまで:
--   title     = "ゼクス Z/X" / "ポケモンカード" 等のシリーズ名
--   full_name = "Z/X-Zillions of enemy X-ブースターパック IG14" 等の本来の商品名
--
-- 改修後:
--   series    = "ゼクス Z/X" / "ポケモンカード" 等のシリーズ名
--   title     = 本来の商品名 (旧 full_name を昇格)
--   full_name = (廃止予定。互換のため残す)
-- =========================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS series text;

-- 既存データを移行: series ← 旧 title、title ← 旧 full_name (なければ title)
UPDATE public.products
SET
  series = COALESCE(series, title),
  title  = COALESCE(NULLIF(full_name, ''), title)
WHERE series IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_series ON public.products(series) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_status_visible ON public.products(status, is_visible) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.products.series IS 'ゲームシリーズ名 (例: ゼクス Z/X, ポケモンカード)';
COMMENT ON COLUMN public.products.title  IS '本来の商品名 (例: 強化拡張パック ポケモンカード151)';
