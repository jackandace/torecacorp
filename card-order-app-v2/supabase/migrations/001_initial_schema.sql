-- =========================================================================
-- 001_initial_schema.sql
-- トレカ商事カンパニー 卸受発注・請求一元管理システム
-- すべての主要テーブル定義
-- =========================================================================

-- 拡張機能
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------------------
-- shops (加盟ショップ)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shops (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name      text NOT NULL,
  contact_name      text NOT NULL,
  email             text UNIQUE NOT NULL,
  phone             text,
  address           text,
  delivery_address  text,
  current_rank      text NOT NULL DEFAULT 'standard'
                    CHECK (current_rank IN ('platinum','gold','silver','bronze','standard')),
  rank_locked_until date,
  rate_override     numeric,
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','active','suspended')),
  oath_signed_at    timestamptz,
  oath_expires_at   timestamptz,
  user_id           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

COMMENT ON COLUMN public.shops.rate_override     IS '個別掛け率上書き (NULL は商品デフォルト適用)';
COMMENT ON COLUMN public.shops.rank_locked_until IS '降格猶予期限。これを過ぎるまで現ランク維持';
COMMENT ON COLUMN public.shops.oath_expires_at   IS '宣誓書失効日 (失効でログイン制限の検討対象)';

-- -------------------------------------------------------------------------
-- rank_settings (ランク閾値・リベート率設定)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rank_settings (
  rank              text PRIMARY KEY
                    CHECK (rank IN ('platinum','gold','silver','bronze','standard')),
  threshold_amount  integer NOT NULL CHECK (threshold_amount >= 0),
  rebate_rate       numeric NOT NULL CHECK (rebate_rate >= 0 AND rebate_rate <= 1),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rank_settings IS '管理者がランク閾値・リベート率を変更できる設定テーブル';

-- -------------------------------------------------------------------------
-- shop_rank_history (ランク変動履歴)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shop_rank_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
  month           date NOT NULL,                       -- 評価月 (月初日)
  prev_rank       text NOT NULL,
  new_rank        text NOT NULL,
  monthly_amount  integer NOT NULL CHECK (monthly_amount >= 0),
  rebate_rate     numeric NOT NULL,
  changed_at      timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- products (商品マスター)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  full_name       text,
  model_number    text,
  category        text NOT NULL CHECK (category IN ('pokemon','onepiece','other')),
  actual_rate     numeric NOT NULL CHECK (actual_rate >= 0 AND actual_rate <= 1),
  rate_markup     numeric NOT NULL DEFAULT 0.10 CHECK (rate_markup >= 0 AND rate_markup <= 1),
  price           integer CHECK (price IS NULL OR price >= 0),
  planned_qty     integer CHECK (planned_qty IS NULL OR planned_qty >= 0),
  ordered_qty     integer NOT NULL DEFAULT 0 CHECK (ordered_qty >= 0),
  ct_to_box       integer NOT NULL DEFAULT 12 CHECK (ct_to_box > 0),
  min_order_box   integer NOT NULL DEFAULT 12 CHECK (min_order_box > 0),
  cut_type        text,
  flow_type       text NOT NULL CHECK (flow_type IN ('haibun','cut')),
  image_url       text,
  is_visible      boolean NOT NULL DEFAULT false,
  is_approved     boolean NOT NULL DEFAULT false,
  order_deadline  date,
  status          text NOT NULL DEFAULT '受付中'
                  CHECK (status IN ('受付中','受付停止','終了')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

COMMENT ON COLUMN public.products.actual_rate IS '実掛け率 (例 0.74 = 74%)';
COMMENT ON COLUMN public.products.rate_markup IS 'デフォルト上乗せ (案内掛け率 = actual_rate + rate_markup)';
COMMENT ON COLUMN public.products.flow_type   IS 'haibun=配分確定品, cut=カット割';

-- -------------------------------------------------------------------------
-- orders (発注管理)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
  product_id        uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  order_unit        text NOT NULL CHECK (order_unit IN ('BOX','CT')),
  requested_qty     integer NOT NULL CHECK (requested_qty > 0),
  requested_qty_box integer CHECK (requested_qty_box IS NULL OR requested_qty_box > 0),
  provisional_qty   integer CHECK (provisional_qty IS NULL OR provisional_qty >= 0),
  confirmed_qty     integer CHECK (confirmed_qty IS NULL OR confirmed_qty >= 0),
  listed_rate       numeric NOT NULL CHECK (listed_rate >= 0 AND listed_rate <= 2),
  rebate_rate       numeric NOT NULL DEFAULT 0 CHECK (rebate_rate >= 0 AND rebate_rate <= 1),
  unit_price        integer CHECK (unit_price IS NULL OR unit_price >= 0),
  subtotal          integer CHECK (subtotal IS NULL OR subtotal >= 0),
  rebate_amount     integer CHECK (rebate_amount IS NULL OR rebate_amount >= 0),
  total_price       integer CHECK (total_price IS NULL OR total_price >= 0),
  status            text NOT NULL DEFAULT 'リクエスト'
                    CHECK (status IN ('リクエスト','発注調整中','仮確定','確定','キャンセル')),
  shipping_status   text NOT NULL DEFAULT '未出荷'
                    CHECK (shipping_status IN ('未出荷','準備中','出荷済','配送中','完了')),
  tracking_number   text,
  consent_agreed_at timestamptz NOT NULL,             -- 免責同意 (必須)
  admin_note        text,
  confirmed_at      timestamptz,
  shipped_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

COMMENT ON COLUMN public.orders.listed_rate   IS '発注時の案内掛け率 (スナップショット)';
COMMENT ON COLUMN public.orders.rebate_rate   IS '発注時の顧客リベート率 (スナップショット)';
COMMENT ON COLUMN public.orders.consent_agreed_at IS '免責事項同意日時。NULL の発注は無効';

-- -------------------------------------------------------------------------
-- invoices (請求書)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
  invoice_number  text UNIQUE NOT NULL,                -- INV-YYYYMM-0001
  rank_at_issue   text NOT NULL,
  subtotal        integer NOT NULL CHECK (subtotal >= 0),
  rebate_rate     numeric NOT NULL CHECK (rebate_rate >= 0 AND rebate_rate <= 1),
  rebate_amount   integer NOT NULL CHECK (rebate_amount >= 0),
  taxable_amount  integer NOT NULL CHECK (taxable_amount >= 0),
  tax_amount      integer NOT NULL CHECK (tax_amount >= 0),
  total_amount    integer NOT NULL CHECK (total_amount >= 0),
  paid_amount     integer NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status          text NOT NULL DEFAULT '未入金'
                  CHECK (status IN ('未入金','一部入金','入金済み')),
  due_date        date,
  paid_at         timestamptz,
  pdf_url         text,
  issued_at       timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- 請求書 - 発注の中間テーブル (1請求 N発注)
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  line_total  integer NOT NULL CHECK (line_total >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_items_order
  ON public.invoice_items(order_id);

-- -------------------------------------------------------------------------
-- audit_logs (操作ログ)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  admin_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  target_table  text NOT NULL,
  target_id     uuid,
  before_data   jsonb,
  after_data    jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- batch_logs (バッチ実行ログ)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batch_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name      text NOT NULL,
  status          text NOT NULL CHECK (status IN ('success','failure','partial')),
  processed_count integer NOT NULL DEFAULT 0,
  error_count     integer NOT NULL DEFAULT 0,
  error_detail    text,
  started_at      timestamptz NOT NULL,
  finished_at     timestamptz
);

-- -------------------------------------------------------------------------
-- notification_templates / notifications (通知)
-- 簡易スキーマ。詳細は通知センター実装時に拡張する。
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,        -- 例 'order_confirmed'
  name        text NOT NULL,
  subject     text NOT NULL,
  body_html   text NOT NULL,
  body_text   text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  template_code text,
  channel      text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','inapp')),
  subject      text NOT NULL,
  body         text NOT NULL,
  sent_at      timestamptz,
  status       text NOT NULL DEFAULT 'queued'
               CHECK (status IN ('queued','sent','failed')),
  error_detail text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------------------
-- surveys (販売店調査レポート)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.surveys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  surveyed_at date NOT NULL,
  surveyor    text,
  content     text NOT NULL,
  pdf_url     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
