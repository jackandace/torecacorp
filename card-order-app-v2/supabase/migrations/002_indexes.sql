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
