-- =========================================================================
-- 022_product_details.sql
-- 商品詳細の拡充: メーカー発売情報 / JANコード / カートン配送情報
--   ・jan_code:          JANコード(13桁想定・任意)
--   ・release_info:      メーカー発売情報の詳細(Web収集/手動)
--   ・carton_delivery:   マスターカートン/カートン単位で届くか
--   ・master_carton_box: マスターカートンあたりのBOX数(任意)
--   ※ カートン(CT)あたりのBOX数は既存の ct_to_box を使用(12/20 等)
-- Supabase SQL Editor で手動実行。
-- =========================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS jan_code text NULL,
  ADD COLUMN IF NOT EXISTS release_info text NULL,
  ADD COLUMN IF NOT EXISTS carton_delivery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS master_carton_box integer NULL CHECK (master_carton_box IS NULL OR master_carton_box > 0);

COMMENT ON COLUMN public.products.jan_code          IS 'JANコード (13桁想定・任意)';
COMMENT ON COLUMN public.products.release_info      IS 'メーカー発売情報の詳細 (Web収集/手動入力)';
COMMENT ON COLUMN public.products.carton_delivery   IS 'マスターカートン/カートン単位で届くか';
COMMENT ON COLUMN public.products.master_carton_box IS 'マスターカートンあたりのBOX数 (任意)';
