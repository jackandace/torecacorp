-- =========================================================================
-- 010_shops_screening_fields.sql
-- ショップ審査・運営情報の追加
--   - business_type: 運営形態 (EC のみ / 実店舗 / 両方 等)
--   - opened_at: 開業日 (2 年以上の運営実績審査用)
--   - business_doc_url: 開業届 / 履歴事項全部証明書のストレージパス
--   - lifetime_amount: 累計発注額 (移行データの手動入力用)
-- =========================================================================

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS business_type   text
    CHECK (business_type IS NULL OR business_type IN ('ec_only','physical_only','physical_and_ec','other'));
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS opened_at       date;
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS business_doc_url text;
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS lifetime_amount integer NOT NULL DEFAULT 0
    CHECK (lifetime_amount >= 0);

COMMENT ON COLUMN public.shops.business_type    IS '運営形態: ec_only / physical_only / physical_and_ec / other';
COMMENT ON COLUMN public.shops.opened_at        IS '開業日 (運営実績 2 年以上の審査基準)';
COMMENT ON COLUMN public.shops.business_doc_url IS '開業届 or 履歴事項全部証明書 (business-docs バケットへのパス)';
COMMENT ON COLUMN public.shops.lifetime_amount  IS '累計発注額 (移行データの手動入力)';

-- 開業届バケット
INSERT INTO storage.buckets (id, name, public) VALUES
  ('business-docs', 'business-docs', false)
ON CONFLICT (id) DO NOTHING;

-- legacy 過去請求書バケット (PDF を別途アップロード)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('legacy-invoices', 'legacy-invoices', false)
ON CONFLICT (id) DO NOTHING;

-- invoices テーブルに legacy 区別フラグを追加
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_legacy boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.invoices.is_legacy IS '本システム外で発行され、後から取り込まれた過去請求書';

-- Storage RLS: business-docs / legacy-invoices は admin のみ
DROP POLICY IF EXISTS "business-docs: admin only" ON storage.objects;
CREATE POLICY "business-docs: admin only" ON storage.objects
  FOR ALL USING (bucket_id = 'business-docs' AND public.is_admin())
  WITH CHECK (bucket_id = 'business-docs' AND public.is_admin());

-- legacy-invoices: 該当ショップは読取可、admin は全操作
DROP POLICY IF EXISTS "legacy-invoices: shop read" ON storage.objects;
CREATE POLICY "legacy-invoices: shop read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'legacy-invoices'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.invoices inv
        JOIN public.shops s ON s.id = inv.shop_id
        WHERE s.user_id = auth.uid()
          AND inv.is_legacy = true
          AND inv.pdf_url LIKE '%' || name || '%'
      )
    )
  );

DROP POLICY IF EXISTS "legacy-invoices: admin write" ON storage.objects;
CREATE POLICY "legacy-invoices: admin write" ON storage.objects
  FOR ALL USING (bucket_id = 'legacy-invoices' AND public.is_admin())
  WITH CHECK (bucket_id = 'legacy-invoices' AND public.is_admin());
