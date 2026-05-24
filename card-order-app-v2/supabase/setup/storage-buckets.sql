-- =========================================================================
-- Storage バケット作成 + RLS ポリシー
-- =========================================================================
-- 注意: バケットは SQL Editor から作成可能ですが、ポリシーは
--       Supabase Dashboard > Storage > Policies の GUI で設定するのが安全です。
--       下記はリファレンス用の SQL です。

-- ---- バケット作成 -----------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images',  'product-images',  true),  -- 公開 (ショップが商品画像を表示)
  ('invoices',        'invoices',        false), -- 非公開 (請求書 PDF)
  ('oath-documents',  'oath-documents',  false), -- 非公開 (宣誓書 PDF)
  ('survey-reports',  'survey-reports',  false)  -- 非公開 (調査レポート PDF)
ON CONFLICT (id) DO NOTHING;

-- ---- ヘルパ関数: admin 判定 (public スキーマで定義済みの再宣言) -------
-- public.is_admin() は 004_rls_policies.sql で作成済み。Storage では再利用。

-- ---- product-images: 読み取り全公開、書込 admin のみ ------------------
DROP POLICY IF EXISTS "product-images: public read" ON storage.objects;
CREATE POLICY "product-images: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product-images: admin write" ON storage.objects;
CREATE POLICY "product-images: admin write" ON storage.objects
  FOR ALL USING (bucket_id = 'product-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- ---- invoices: 該当ショップのみ読取 / admin のみ書込 ------------------
DROP POLICY IF EXISTS "invoices: shop read" ON storage.objects;
CREATE POLICY "invoices: shop read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'invoices'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.invoices inv
        JOIN public.shops s ON s.id = inv.shop_id
        WHERE s.user_id = auth.uid()
          AND inv.pdf_url LIKE '%' || name || '%'
      )
    )
  );

DROP POLICY IF EXISTS "invoices: admin write" ON storage.objects;
CREATE POLICY "invoices: admin write" ON storage.objects
  FOR ALL USING (bucket_id = 'invoices' AND public.is_admin())
  WITH CHECK (bucket_id = 'invoices' AND public.is_admin());

-- ---- oath-documents: admin のみ全操作 ---------------------------------
DROP POLICY IF EXISTS "oath-documents: admin only" ON storage.objects;
CREATE POLICY "oath-documents: admin only" ON storage.objects
  FOR ALL USING (bucket_id = 'oath-documents' AND public.is_admin())
  WITH CHECK (bucket_id = 'oath-documents' AND public.is_admin());

-- ---- survey-reports: admin のみ全操作 ---------------------------------
DROP POLICY IF EXISTS "survey-reports: admin only" ON storage.objects;
CREATE POLICY "survey-reports: admin only" ON storage.objects
  FOR ALL USING (bucket_id = 'survey-reports' AND public.is_admin())
  WITH CHECK (bucket_id = 'survey-reports' AND public.is_admin());
