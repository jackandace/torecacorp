-- =========================================================================
-- 018_performance_and_archival.sql
-- パフォーマンス用インデックス追加 + 長期運用のためのアーカイブ機構
-- =========================================================================

-- ---- 1. 欠落インデックスの追加 -------------------------------------------

-- 問い合わせの担当者単独検索 (タスク画面で使用)
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned
  ON public.inquiries(assigned_to, created_at DESC)
  WHERE deleted_at IS NULL;

-- 発注の created_at 範囲検索 (月次集計・レポート)
CREATE INDEX IF NOT EXISTS idx_orders_created_status
  ON public.orders(created_at DESC, status)
  WHERE deleted_at IS NULL;

-- 通知のショップ別 + 作成日 (通知履歴ページ)
CREATE INDEX IF NOT EXISTS idx_notifications_shop_created
  ON public.notifications(shop_id, created_at DESC);

-- 変更申請の作成日 (履歴)
CREATE INDEX IF NOT EXISTS idx_change_requests_created
  ON public.shop_change_requests(created_at DESC);

-- 請求サマリ: 未入金・一部入金の抽出 (入金済み以外を部分インデックス化)
CREATE INDEX IF NOT EXISTS idx_invoices_open
  ON public.invoices(status, due_date)
  WHERE deleted_at IS NULL AND status <> '入金済み';

-- 請求サマリ: 今月入金分の抽出
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at
  ON public.invoices(paid_at)
  WHERE deleted_at IS NULL AND paid_at IS NOT NULL;

-- ---- 2. アーカイブ用テーブル ---------------------------------------------
-- 1 年以上前の監査ログ・送信済み通知を移動して本番テーブルを軽く保つ。
-- アーカイブ後も参照は可能 (別テーブル)。

CREATE TABLE IF NOT EXISTS public.audit_logs_archive (
  LIKE public.audit_logs INCLUDING ALL
);

CREATE TABLE IF NOT EXISTS public.notifications_archive (
  LIKE public.notifications INCLUDING ALL
);

ALTER TABLE public.audit_logs_archive   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archive_audit_admin"  ON public.audit_logs_archive;
DROP POLICY IF EXISTS "archive_notif_admin"  ON public.notifications_archive;
CREATE POLICY "archive_audit_admin" ON public.audit_logs_archive
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "archive_notif_admin" ON public.notifications_archive
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---- 3. アーカイブ実行関数 -----------------------------------------------
-- monthsOld ヶ月より古いレコードをアーカイブテーブルへ移動する。
-- SECURITY DEFINER で service_role / cron から呼ぶ前提。

CREATE OR REPLACE FUNCTION public.archive_old_data(months_old integer DEFAULT 12)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff timestamptz := now() - (months_old || ' months')::interval;
  moved_audit   integer := 0;
  moved_notif   integer := 0;
  purged_orders integer := 0;
  purged_products integer := 0;
BEGIN
  -- 監査ログ: cutoff より古いものをアーカイブへ移動
  WITH moved AS (
    DELETE FROM public.audit_logs
    WHERE created_at < cutoff
    RETURNING *
  )
  INSERT INTO public.audit_logs_archive SELECT * FROM moved;
  GET DIAGNOSTICS moved_audit = ROW_COUNT;

  -- 送信済み/失敗通知: cutoff より古いものをアーカイブへ移動 (queued は残す)
  WITH moved AS (
    DELETE FROM public.notifications
    WHERE created_at < cutoff AND status IN ('sent','failed')
    RETURNING *
  )
  INSERT INTO public.notifications_archive SELECT * FROM moved;
  GET DIAGNOSTICS moved_notif = ROW_COUNT;

  -- 論理削除済みで 1 年以上経過した orders / products を物理削除 (容量回収)
  -- (請求書に紐づく確定発注は invoice_items の FK で守られるため安全)
  DELETE FROM public.orders
  WHERE deleted_at IS NOT NULL AND deleted_at < cutoff
    AND id NOT IN (SELECT order_id FROM public.invoice_items);
  GET DIAGNOSTICS purged_orders = ROW_COUNT;

  DELETE FROM public.products
  WHERE deleted_at IS NOT NULL AND deleted_at < cutoff
    AND id NOT IN (SELECT product_id FROM public.orders);
  GET DIAGNOSTICS purged_products = ROW_COUNT;

  RETURN jsonb_build_object(
    'cutoff', cutoff,
    'archived_audit_logs', moved_audit,
    'archived_notifications', moved_notif,
    'purged_orders', purged_orders,
    'purged_products', purged_products
  );
END;
$$;
