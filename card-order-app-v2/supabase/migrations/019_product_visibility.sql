-- =========================================================================
-- 019_product_visibility.sql
-- 再配分品など「限定公開」のための商品表示制御
--   (1) ランク別表示: products.min_rank 以上のショップにのみ表示
--   (2) 個別指名:     product_shop_access に登録したショップにのみ表示(ランク優先)
-- Supabase SQL Editor で手動実行。
-- =========================================================================

-- 1. 最低表示ランク (null=制限なし)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS min_rank text NULL
  CHECK (min_rank IS NULL OR min_rank IN ('standard','bronze','silver','gold','platinum'));

-- 2. 個別指名公開テーブル
CREATE TABLE IF NOT EXISTS public.product_shop_access (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  shop_id    uuid NOT NULL REFERENCES public.shops(id)    ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, shop_id)
);

CREATE INDEX IF NOT EXISTS idx_product_shop_access_product ON public.product_shop_access(product_id);
CREATE INDEX IF NOT EXISTS idx_product_shop_access_shop    ON public.product_shop_access(shop_id);

ALTER TABLE public.product_shop_access ENABLE ROW LEVEL SECURITY;

-- admin は全操作可
DROP POLICY IF EXISTS "psa_admin_all" ON public.product_shop_access;
CREATE POLICY "psa_admin_all" ON public.product_shop_access
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ショップは自分宛の指名行のみ参照可 (表示判定に使用)
DROP POLICY IF EXISTS "psa_shop_select" ON public.product_shop_access;
CREATE POLICY "psa_shop_select" ON public.product_shop_access
  FOR SELECT USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

-- 3. 個別案内 通知テンプレート
INSERT INTO public.notification_templates (code, name, subject, body_html, body_text) VALUES
  (
    'product_offer',
    '商品 個別案内',
    '【トレカ商事】{{company_name}} 様へ商品のご案内',
    '<p>{{company_name}} 様</p>
<p>数量限定の商品をご案内いたします。発注ページよりご確認ください。</p>
<p>商品: {{product_title}}</p>
<p>※ 本商品は限定公開です。お早めにご検討ください。</p>',
    '{{company_name}} 様

数量限定の商品をご案内いたします。発注ページよりご確認ください。

商品: {{product_title}}

※ 本商品は限定公開です。お早めにご検討ください。'
  )
ON CONFLICT (code) DO UPDATE SET
  name      = EXCLUDED.name,
  subject   = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  updated_at = now();
