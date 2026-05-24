-- =========================================================================
-- 006_storage_buckets.sql
-- Storage バケット作成 (Supabase SQL Editor で手動実行を推奨)
-- =========================================================================

-- 商品画像 (公開)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 請求書 PDF (非公開・署名付き URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- 宣誓書 (非公開・厳格)
INSERT INTO storage.buckets (id, name, public)
VALUES ('oath-documents', 'oath-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 販売店調査 PDF (非公開)
INSERT INTO storage.buckets (id, name, public)
VALUES ('survey-reports', 'survey-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS は Supabase Dashboard > Storage > Policies で個別設定すること
-- 推奨ポリシー:
--   product-images : 全員 SELECT 可、admin のみ INSERT/UPDATE/DELETE
--   invoices       : 該当ショップのみ SELECT、admin のみ INSERT/UPDATE/DELETE
--   oath-documents : admin のみ全操作
--   survey-reports : admin のみ全操作
