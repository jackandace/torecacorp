-- 025_refund_account.sql : 返金先口座の事前登録
--
-- カット品の差額返金(支払通知書)発生時に、口座を都度手書きさせず事前登録した
-- 口座へ振り込めるようにする。変更は shop_change_requests 経由の承認制(なりすまし防止)。

-- 1) shops に返金先口座カラムを追加
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS refund_bank_name          text,
  ADD COLUMN IF NOT EXISTS refund_bank_branch        text,
  ADD COLUMN IF NOT EXISTS refund_account_type       text,
  ADD COLUMN IF NOT EXISTS refund_account_number     text,
  ADD COLUMN IF NOT EXISTS refund_account_holder     text,   -- 口座名義(カナ)
  ADD COLUMN IF NOT EXISTS refund_account_updated_at timestamptz;

-- 口座種別は 普通 / 当座 のみ
ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_refund_account_type_chk;
ALTER TABLE public.shops
  ADD CONSTRAINT shops_refund_account_type_chk
  CHECK (refund_account_type IS NULL OR refund_account_type IN ('普通','当座'));

-- 2) 変更申請の対象フィールドに refund_account を追加
ALTER TABLE public.shop_change_requests DROP CONSTRAINT IF EXISTS shop_change_requests_field_check;
ALTER TABLE public.shop_change_requests
  ADD CONSTRAINT shop_change_requests_field_check
  CHECK (field IN ('delivery_address','company_name','address','refund_account'));
