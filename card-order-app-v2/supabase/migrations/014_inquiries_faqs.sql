-- =========================================================================
-- 014_inquiries_faqs.sql
-- 顧客問い合わせ + FAQ
-- =========================================================================

-- 問い合わせ本体
CREATE TABLE IF NOT EXISTS public.inquiries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id             uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  subject             text NOT NULL,
  body                text NOT NULL,
  related_product_id  uuid REFERENCES public.products(id) ON DELETE SET NULL,
  related_model       text,                                    -- 型番文字列 (商品が削除されても残す)
  category            text NOT NULL DEFAULT 'other'
                      CHECK (category IN ('product','order','invoice','shipping','account','other')),
  status              text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','waiting_shop','resolved','closed')),
  priority            text NOT NULL DEFAULT 'normal'
                      CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_reply_by       text,                                    -- 'shop' or 'admin'
  last_reply_at       timestamptz,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_inquiries_shop_status
  ON public.inquiries(shop_id, status, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_status_assigned
  ON public.inquiries(status, assigned_to, created_at DESC)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_inquiries ON public.inquiries;
CREATE TRIGGER set_updated_at_inquiries
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- メッセージ (スレッド)
CREATE TABLE IF NOT EXISTS public.inquiry_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id    uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  from_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  from_kind     text NOT NULL CHECK (from_kind IN ('shop','admin')),
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiry_messages_inquiry
  ON public.inquiry_messages(inquiry_id, created_at);

-- RLS
ALTER TABLE public.inquiries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_messages  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_shop_own"   ON public.inquiries;
DROP POLICY IF EXISTS "inquiries_admin_all"  ON public.inquiries;
DROP POLICY IF EXISTS "messages_shop_own"    ON public.inquiry_messages;
DROP POLICY IF EXISTS "messages_admin_all"   ON public.inquiry_messages;

CREATE POLICY "inquiries_shop_own" ON public.inquiries
  FOR ALL USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    OR public.is_admin()
  ) WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "inquiries_admin_all" ON public.inquiries
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "messages_shop_own" ON public.inquiry_messages
  FOR ALL USING (
    inquiry_id IN (
      SELECT id FROM public.inquiries
      WHERE shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    )
    OR public.is_admin()
  ) WITH CHECK (
    inquiry_id IN (
      SELECT id FROM public.inquiries
      WHERE shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    )
    OR public.is_admin()
  );

CREATE POLICY "messages_admin_all" ON public.inquiry_messages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- FAQ
CREATE TABLE IF NOT EXISTS public.faqs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category      text NOT NULL DEFAULT 'other'
                CHECK (category IN ('account','order','invoice','shipping','product','rank','other')),
  question      text NOT NULL,
  answer        text NOT NULL,
  sort_order    integer NOT NULL DEFAULT 100,
  is_published  boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_faqs_published
  ON public.faqs(category, sort_order)
  WHERE is_published = true AND deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_faqs ON public.faqs;
CREATE TRIGGER set_updated_at_faqs
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "faqs_read_public"  ON public.faqs;
DROP POLICY IF EXISTS "faqs_admin_all"    ON public.faqs;
CREATE POLICY "faqs_read_public" ON public.faqs
  FOR SELECT USING (is_published = true AND deleted_at IS NULL OR public.is_admin());
CREATE POLICY "faqs_admin_all" ON public.faqs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 通知テンプレートに問い合わせ系を追加
INSERT INTO public.notification_templates (code, name, subject, body_html, body_text) VALUES
  ('inquiry_received', '問い合わせ受領', '【トレカ商事】お問い合わせを受け付けました',
    '<p>{{company_name}} 様</p><p>お問い合わせ「{{subject}}」を受け付けました。担当者より追ってご連絡いたします。</p>',
    'お問い合わせを受け付けました。担当者より追ってご連絡いたします。'),
  ('inquiry_replied', '問い合わせ返信', '【トレカ商事】お問い合わせに返信がありました',
    '<p>{{company_name}} 様</p><p>「{{subject}}」に返信がありました。マイページからご確認ください。</p>',
    'お問い合わせに返信があります。マイページからご確認ください。')
ON CONFLICT (code) DO NOTHING;
