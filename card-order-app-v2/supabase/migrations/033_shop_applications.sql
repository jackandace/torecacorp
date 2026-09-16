-- =========================================================================
-- 033_shop_applications.sql
-- ショップ登録の審査申込み (公開フォーム /apply) — 2026-09-16
--
-- 背景: 卸問い合わせの自動返信で Google フォームへ誘導していたが、
--   回答が管理画面に乗らず対応漏れが起きるため、アプリ内の公開申請フォーム
--   → 管理画面「ショップ審査」→ 承認で招待リンク自動送付、に一本化する。
-- 公開フォームからの INSERT は API (Service Role) 経由。RLS は admin のみ。
-- Supabase SQL Editor で手動実行。
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.shop_applications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      text NOT NULL,
  contact_name      text NOT NULL,
  email             text NOT NULL,
  phone             text NOT NULL,
  billing_name      text,                -- 請求書発行先名称 (会社名と異なる場合)
  address           text NOT NULL,       -- 登録住所 (郵便番号含む)
  delivery_address  text NOT NULL,       -- 配送先住所 (郵便番号含む)
  receiver_name     text,                -- 配送先の受取人名
  business_type     text NOT NULL CHECK (business_type IN ('physical_only','physical_and_ec','ec_only')),
  opened_at         date,                -- 開業日 (運営歴の審査基準)
  store_url         text,                -- 店舗紹介/ECサイトURL (審査材料)
  interested_titles text,                -- 新商品案内を希望するタイトル (自由記入)
  note              text,                -- 申請者の備考
  terms_agreed_at   timestamptz NOT NULL,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by       uuid,                -- 審査した管理者
  reviewed_at       timestamptz,
  review_note       text,                -- 審査メモ (却下理由など)
  invite_id         uuid REFERENCES public.registration_invites(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_applications_status ON public.shop_applications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_applications_email  ON public.shop_applications(email);

ALTER TABLE public.shop_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only_shop_applications" ON public.shop_applications;
CREATE POLICY "admin_only_shop_applications" ON public.shop_applications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- updated_at 自動更新 (既存の共通トリガ関数を利用)
DROP TRIGGER IF EXISTS trg_shop_applications_updated_at ON public.shop_applications;
CREATE TRIGGER trg_shop_applications_updated_at
  BEFORE UPDATE ON public.shop_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
