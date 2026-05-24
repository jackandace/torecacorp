-- =========================================================================
-- セットアップ検証用 SQL
-- =========================================================================
-- マイグレーション適用後に実行して、想定どおりの状態かを確認します。

-- ---- テーブル一覧 ----------------------------------------------------
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- 期待: 12 テーブル
--   audit_logs / batch_logs / invoice_items / invoices / notification_templates
--   notifications / orders / products / rank_settings / shop_rank_history
--   shops / surveys

-- ---- RLS が全テーブルで有効か ----------------------------------------
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
-- 期待: rowsecurity が全 true

-- ---- ヘルパ関数 -------------------------------------------------------
SELECT proname FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN ('is_admin', 'is_super_admin', 'set_updated_at', 'increment_product_ordered_qty');
-- 期待: 4 行

-- ---- 初期データ: ランク設定 ------------------------------------------
SELECT rank, threshold_amount, rebate_rate FROM public.rank_settings ORDER BY threshold_amount DESC;
-- 期待: platinum / gold / silver / bronze / standard の 5 行

-- ---- 初期データ: 通知テンプレート ------------------------------------
SELECT code, name FROM public.notification_templates ORDER BY code;
-- 期待: order_received, order_provisional, order_confirmed, order_shipped,
--       invoice_issued, rank_changed, oath_expiring の 7 種

-- ---- Storage バケット -------------------------------------------------
SELECT id, public FROM storage.buckets ORDER BY id;
-- 期待: invoices(false), oath-documents(false), product-images(true), survey-reports(false)

-- ---- 管理者ユーザー一覧 -----------------------------------------------
SELECT email, raw_user_meta_data->>'role' AS role, created_at
FROM auth.users
WHERE raw_user_meta_data->>'role' IN ('admin', 'super_admin')
ORDER BY created_at;
-- 期待: 少なくとも 1 件
