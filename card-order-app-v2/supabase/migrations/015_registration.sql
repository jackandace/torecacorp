-- =========================================================================
-- 015_registration.sql
-- 新規会員登録フロー (招待トークン制) + 規約同意記録 + Realtime 在庫配信
--
-- フロー:
--   1. メール一次問い合わせ → 簡易ヒアリング (システム外・自動返信メール)
--   2. 条件クリア (実店舗あり / 運営歴) を admin が確認
--   3. admin がこの画面で招待リンクを発行 → メールで送付
--   4. ショップが /register?token=xxx で登録フォーム入力 + 規約同意
--   5. Supabase invite メールで認証 → パスワード設定 → ログイン
-- =========================================================================

-- ---- 招待トークン ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.registration_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token           text UNIQUE NOT NULL,
  email           text,                 -- 案内先メール (フォームにプリフィル)
  company_name    text,                 -- ヒアリング時に判明していれば
  note            text,                 -- 審査メモ (実店舗確認済み等)
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  used_by_shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_invites_token
  ON public.registration_invites(token) WHERE used_at IS NULL;

ALTER TABLE public.registration_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invites_admin_all" ON public.registration_invites;
CREATE POLICY "invites_admin_all" ON public.registration_invites
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- 注: トークン検証・消込はサーバー側 (service_role) で実施するため anon ポリシーは作らない

-- ---- 規約同意の記録 -------------------------------------------------------
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS terms_agreed_at timestamptz;

COMMENT ON COLUMN public.shops.terms_agreed_at IS '利用注意事項・免責事項への同意日時 (新規登録時に記録)';

-- ---- Realtime: products の在庫変動をクライアントに配信 --------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- 既に追加済みなら無視
END $$;
