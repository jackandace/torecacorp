-- ====================================================================
-- トレカ商事カンパニー Supabase ワンショットセットアップ SQL
-- ====================================================================
-- 使い方:
--   Supabase Dashboard > SQL Editor > New query にこの全文を貼り、Run
--   001 → 008 のマイグレーションを順次適用します
-- ====================================================================


-- ========== 001_initial_schema.sql ==========
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


-- ========== 002_indexes.sql ==========
-- =========================================================================
-- 002_indexes.sql
-- 検索性能のためのインデックス
-- =========================================================================

-- orders: ショップ別ステータス検索 (頻出)
CREATE INDEX IF NOT EXISTS idx_orders_shop_status
  ON public.orders(shop_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_product
  ON public.orders(product_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_shipping
  ON public.orders(shipping_status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_active
  ON public.orders(created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_consent
  ON public.orders(consent_agreed_at);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_shop_status
  ON public.invoices(shop_id, status, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_issued_at
  ON public.invoices(issued_at DESC)
  WHERE deleted_at IS NULL;

-- shops
CREATE INDEX IF NOT EXISTS idx_shops_rank_status
  ON public.shops(current_rank, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_shops_user_id
  ON public.shops(user_id);

-- products
CREATE INDEX IF NOT EXISTS idx_products_visible
  ON public.products(is_visible, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_category
  ON public.products(category)
  WHERE deleted_at IS NULL;

-- shop_rank_history
CREATE INDEX IF NOT EXISTS idx_rank_history_shop_month
  ON public.shop_rank_history(shop_id, month DESC);

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_target
  ON public.audit_logs(target_table, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_admin
  ON public.audit_logs(admin_id, created_at DESC);

-- batch_logs
CREATE INDEX IF NOT EXISTS idx_batch_logs_name_started
  ON public.batch_logs(batch_name, started_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_shop_sent
  ON public.notifications(shop_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_status_queued
  ON public.notifications(status)
  WHERE status = 'queued';


-- ========== 003_triggers.sql ==========
-- =========================================================================
-- 003_triggers.sql
-- updated_at 自動更新トリガー
-- =========================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 対象テーブルにトリガーを設定
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'shops',
    'products',
    'orders',
    'invoices',
    'rank_settings',
    'surveys',
    'notification_templates'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at_%I ON public.%I;', t, t
    );
    EXECUTE format(
      'CREATE TRIGGER set_updated_at_%I
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;


-- ========== 004_rls_policies.sql ==========
-- =========================================================================
-- 004_rls_policies.sql
-- Row Level Security
--   ロール判定は auth.users.raw_user_meta_data->>'role' を参照
--   role IN ('admin','super_admin') で管理者扱い
-- =========================================================================

-- -------- ヘルパー関数: 現在ユーザーが管理者か ---------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' IN ('admin','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'super_admin'
  );
$$;

-- -------- shops -----------------------------------------------------------
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_self_read"  ON public.shops;
DROP POLICY IF EXISTS "shop_self_update" ON public.shops;
DROP POLICY IF EXISTS "admin_all_shops" ON public.shops;

CREATE POLICY "shop_self_read" ON public.shops
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "shop_self_update" ON public.shops
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "admin_all_shops" ON public.shops
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -------- products --------------------------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_visible_products" ON public.products;
DROP POLICY IF EXISTS "admin_all_products"    ON public.products;

CREATE POLICY "shop_visible_products" ON public.products
  FOR SELECT
  USING (
    (is_visible = true AND deleted_at IS NULL)
    OR public.is_admin()
  );

CREATE POLICY "admin_all_products" ON public.products
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -------- orders ----------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_own_orders_select" ON public.orders;
DROP POLICY IF EXISTS "shop_own_orders_insert" ON public.orders;
DROP POLICY IF EXISTS "admin_all_orders"       ON public.orders;

CREATE POLICY "shop_own_orders_select" ON public.orders
  FOR SELECT
  USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "shop_own_orders_insert" ON public.orders
  FOR INSERT
  WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "admin_all_orders" ON public.orders
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -------- invoices --------------------------------------------------------
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_own_invoices" ON public.invoices;
DROP POLICY IF EXISTS "admin_all_invoices" ON public.invoices;

CREATE POLICY "shop_own_invoices" ON public.invoices
  FOR SELECT
  USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "admin_all_invoices" ON public.invoices
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -------- invoice_items ---------------------------------------------------
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_own_invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "admin_all_invoice_items" ON public.invoice_items;

CREATE POLICY "shop_own_invoice_items" ON public.invoice_items
  FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM public.invoices
      WHERE shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    )
    OR public.is_admin()
  );

CREATE POLICY "admin_all_invoice_items" ON public.invoice_items
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -------- rank_settings ---------------------------------------------------
ALTER TABLE public.rank_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rank_settings_read"  ON public.rank_settings;
DROP POLICY IF EXISTS "rank_settings_write" ON public.rank_settings;

CREATE POLICY "rank_settings_read" ON public.rank_settings
  FOR SELECT USING (true);

CREATE POLICY "rank_settings_write" ON public.rank_settings
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- -------- shop_rank_history -----------------------------------------------
ALTER TABLE public.shop_rank_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_own_rank_history" ON public.shop_rank_history;
DROP POLICY IF EXISTS "admin_all_rank_history" ON public.shop_rank_history;

CREATE POLICY "shop_own_rank_history" ON public.shop_rank_history
  FOR SELECT
  USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "admin_all_rank_history" ON public.shop_rank_history
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -------- audit_logs / batch_logs / notifications / surveys (admin only) --
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surveys               ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only_audit_logs"            ON public.audit_logs;
DROP POLICY IF EXISTS "admin_only_batch_logs"            ON public.batch_logs;
DROP POLICY IF EXISTS "admin_only_notifications"         ON public.notifications;
DROP POLICY IF EXISTS "shop_own_notifications"           ON public.notifications;
DROP POLICY IF EXISTS "admin_only_notification_templates" ON public.notification_templates;
DROP POLICY IF EXISTS "admin_only_surveys"               ON public.surveys;

CREATE POLICY "admin_only_audit_logs" ON public.audit_logs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_only_batch_logs" ON public.batch_logs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "shop_own_notifications" ON public.notifications
  FOR SELECT
  USING (
    shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "admin_only_notifications" ON public.notifications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_only_notification_templates" ON public.notification_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "admin_only_surveys" ON public.surveys
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ========== 005_seed.sql ==========
-- =========================================================================
-- 005_seed.sql
-- 初期データ (ランク閾値・通知テンプレート)
-- =========================================================================

-- ランク閾値・リベート率
INSERT INTO public.rank_settings (rank, threshold_amount, rebate_rate) VALUES
  ('platinum', 1000000, 0.10),
  ('gold',      500000, 0.07),
  ('silver',    200000, 0.05),
  ('bronze',    100000, 0.03),
  ('standard',       0, 0.00)
ON CONFLICT (rank) DO NOTHING;

-- 通知テンプレート (Phase 7 で具体化)
INSERT INTO public.notification_templates (code, name, subject, body_html, body_text) VALUES
  ('order_received',     '発注リクエスト受領',  '【トレカ商事】発注リクエストを受け付けました',                      '<p>発注リクエストを受け付けました。</p>',          '発注リクエストを受け付けました。'),
  ('order_provisional',  '仮確定通知',          '【トレカ商事】ご発注内容が仮確定しました',                          '<p>ご発注内容が仮確定しました。</p>',              'ご発注内容が仮確定しました。'),
  ('order_confirmed',    '確定通知',            '【トレカ商事】ご発注内容が確定しました',                            '<p>ご発注内容が確定しました。</p>',                'ご発注内容が確定しました。'),
  ('order_shipped',      '発送通知',            '【トレカ商事】商品を発送しました',                                  '<p>商品を発送しました。</p>',                      '商品を発送しました。'),
  ('invoice_issued',     '請求書発行通知',      '【トレカ商事】請求書を発行しました',                                '<p>請求書を発行しました。</p>',                    '請求書を発行しました。'),
  ('rank_changed',       'ランク変動通知',      '【トレカ商事】会員ランクが変更されました',                          '<p>会員ランクが変更されました。</p>',              '会員ランクが変更されました。'),
  ('oath_expiring',      '宣誓書失効アラート',  '【トレカ商事】宣誓書の更新が必要です',                              '<p>宣誓書の更新期限が近づいています。</p>',        '宣誓書の更新期限が近づいています。')
ON CONFLICT (code) DO NOTHING;


-- ========== 007_rpc_functions.sql ==========
-- =========================================================================
-- 007_rpc_functions.sql
-- 競合安全な数値増減用 RPC
-- =========================================================================

CREATE OR REPLACE FUNCTION public.increment_product_ordered_qty(
  p_product_id uuid,
  p_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET ordered_qty = GREATEST(0, ordered_qty + p_delta),
      updated_at = now()
  WHERE id = p_product_id;
END;
$$;

-- shop_rank_history の同 shop/同 month の重複を防止する複合ユニーク
ALTER TABLE public.shop_rank_history
  DROP CONSTRAINT IF EXISTS uq_shop_rank_history_shop_month;
ALTER TABLE public.shop_rank_history
  ADD CONSTRAINT uq_shop_rank_history_shop_month UNIQUE (shop_id, month);


-- ========== 008_notification_templates_v2.sql ==========
-- =========================================================================
-- 008_notification_templates_v2.sql
-- 通知テンプレートに変数差し込みを実装したバージョン
-- 既存テンプレートを UPSERT で更新
-- =========================================================================

INSERT INTO public.notification_templates (code, name, subject, body_html, body_text) VALUES
  (
    'order_received',
    '発注リクエスト受領',
    '【トレカ商事】発注リクエストを受け付けました',
    '<p>{{company_name}} 様</p>
<p>発注リクエストを受け付けました。担当より追ってご連絡いたします。</p>
<p>件数: {{order_count}} 件 / 商品: {{product_titles}}</p>
<p>※ 本メールは送信専用です。</p>',
    '{{company_name}} 様

発注リクエストを受け付けました。担当より追ってご連絡いたします。

件数: {{order_count}} 件
商品: {{product_titles}}

※ 本メールは送信専用です。'
  ),
  (
    'order_provisional',
    '仮確定通知',
    '【トレカ商事】ご発注内容が仮確定しました',
    '<p>{{company_name}} 様</p>
<p>ご発注内容が仮確定となりました。マイページよりご確認ください。</p>
<p>商品: {{product_title}} / 仮確定数量: {{provisional_qty}} BOX</p>',
    '{{company_name}} 様

ご発注内容が仮確定となりました。
商品: {{product_title}}
仮確定数量: {{provisional_qty}} BOX

マイページよりご確認ください。'
  ),
  (
    'order_confirmed',
    '確定通知',
    '【トレカ商事】ご発注内容が確定しました',
    '<p>{{company_name}} 様</p>
<p>以下の発注内容が確定しました。</p>
<p>商品: {{product_title}} / 確定数量: {{confirmed_qty}} BOX</p>
<p>請求書の発行までしばらくお待ちください。</p>',
    '{{company_name}} 様

ご発注内容が確定しました。
商品: {{product_title}}
確定数量: {{confirmed_qty}} BOX

請求書の発行までしばらくお待ちください。'
  ),
  (
    'order_shipped',
    '発送通知',
    '【トレカ商事】商品を発送しました',
    '<p>{{company_name}} 様</p>
<p>ご注文の商品を発送いたしました。</p>
<p>商品: {{product_title}}<br>追跡番号: {{tracking_number}}</p>',
    '{{company_name}} 様

ご注文の商品を発送いたしました。
商品: {{product_title}}
追跡番号: {{tracking_number}}'
  ),
  (
    'invoice_issued',
    '請求書発行通知',
    '【トレカ商事】請求書を発行しました ({{invoice_number}})',
    '<p>{{company_name}} 様</p>
<p>請求書を発行しました。</p>
<ul>
  <li>請求書番号: {{invoice_number}}</li>
  <li>請求合計: ¥{{total_amount}}</li>
  <li>支払期限: {{due_date}}</li>
</ul>
<p>マイページの請求書一覧よりPDFをダウンロードできます。</p>',
    '{{company_name}} 様

請求書を発行しました。
請求書番号: {{invoice_number}}
請求合計: ¥{{total_amount}}
支払期限: {{due_date}}

マイページよりPDFをダウンロードできます。'
  ),
  (
    'rank_changed',
    'ランク変動通知',
    '【トレカ商事】会員ランクが変更されました',
    '<p>{{company_name}} 様</p>
<p>会員ランクが {{prev_rank}} から {{new_rank}} に変更されました。</p>
<p>新しいリベート率: {{rebate_rate}}</p>
<p>今月の発注額: ¥{{monthly_amount}}</p>',
    '{{company_name}} 様

会員ランクが {{prev_rank}} から {{new_rank}} に変更されました。
新しいリベート率: {{rebate_rate}}
今月の発注額: ¥{{monthly_amount}}'
  ),
  (
    'oath_expiring',
    '宣誓書失効アラート',
    '【トレカ商事】宣誓書の更新が必要です',
    '<p>{{company_name}} 様</p>
<p>宣誓書の失効日が {{days_until_expiry}} 日後に迫っています ({{expiry_date}})。</p>
<p>更新手続きをお願いします。</p>',
    '{{company_name}} 様

宣誓書の失効日が {{days_until_expiry}} 日後に迫っています ({{expiry_date}})。
更新手続きをお願いします。'
  )
ON CONFLICT (code) DO UPDATE SET
  name      = EXCLUDED.name,
  subject   = EXCLUDED.subject,
  body_html = EXCLUDED.body_html,
  body_text = EXCLUDED.body_text,
  updated_at = now();

