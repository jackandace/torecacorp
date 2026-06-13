-- =========================================================================
-- 017_change_requests.sql
-- ショップ情報の変更承認フロー (なりすまし対策)
--
-- ショップ自身が直接変更できる項目を制限:
--   直接変更可  : 担当者名・電話番号
--   変更不可    : 会社名・屋号、登録住所 (管理者のみ変更可能)
--   承認制      : 配送先住所 → 変更リクエスト → admin 承認で反映 + 通知
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.shop_change_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  field         text NOT NULL CHECK (field IN ('delivery_address','company_name','address')),
  current_value text,
  new_value     text NOT NULL,
  reason        text,                                  -- ショップ側の変更理由
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected')),
  reviewed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  review_note   text,                                  -- 却下理由など
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_change_requests_pending
  ON public.shop_change_requests(status, created_at DESC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_change_requests_shop
  ON public.shop_change_requests(shop_id, created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_change_requests ON public.shop_change_requests;
CREATE TRIGGER set_updated_at_change_requests
  BEFORE UPDATE ON public.shop_change_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.shop_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "change_requests_shop_own"  ON public.shop_change_requests;
DROP POLICY IF EXISTS "change_requests_admin_all" ON public.shop_change_requests;

-- ショップ: 自分のリクエストの閲覧と作成のみ (更新・取消は admin 経由)
CREATE POLICY "change_requests_shop_own" ON public.shop_change_requests
  FOR SELECT USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "change_requests_admin_all" ON public.shop_change_requests
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- INSERT はショップ本人も可 (自分の shop_id のみ)
DROP POLICY IF EXISTS "change_requests_shop_insert" ON public.shop_change_requests;
CREATE POLICY "change_requests_shop_insert" ON public.shop_change_requests
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    OR public.is_admin()
  );

-- ---- 通知テンプレート ------------------------------------------------------
INSERT INTO public.notification_templates (code, name, subject, body_html, body_text) VALUES
  ('change_requested', '変更申請受付', '【トレカ商事】変更申請を受け付けました',
    '<p>{{company_name}} 様</p><p>{{field_label}}の変更申請を受け付けました。担当者が確認のうえ、結果をご連絡いたします。</p><p>申請内容: {{new_value}}</p>',
    '変更申請を受け付けました。担当者が確認のうえ結果をご連絡いたします。'),
  ('change_approved', '変更申請承認', '【トレカ商事】変更申請が承認されました',
    '<p>{{company_name}} 様</p><p>{{field_label}}の変更申請が承認され、登録情報を更新しました。</p><p>新しい内容: {{new_value}}</p>',
    '変更申請が承認され、登録情報を更新しました。'),
  ('change_rejected', '変更申請却下', '【トレカ商事】変更申請について',
    '<p>{{company_name}} 様</p><p>{{field_label}}の変更申請について、確認の結果、今回は承認を見送らせていただきました。</p><p>理由: {{review_note}}</p><p>ご不明点は担当者までお問い合わせください。</p>',
    '変更申請は承認されませんでした。詳細は担当者までお問い合わせください。')
ON CONFLICT (code) DO NOTHING;
