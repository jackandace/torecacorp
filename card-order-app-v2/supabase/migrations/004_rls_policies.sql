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
