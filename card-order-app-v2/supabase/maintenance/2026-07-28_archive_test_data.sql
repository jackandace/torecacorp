-- =========================================================================
-- 2026-07-28_archive_test_data.sql
-- 2026-07-15 以前(JST)の発注・請求データ = テストデータのアーカイブ
--
-- 完全削除はせず deleted_at を立てる (ソフトデリート)。
-- 管理画面の一覧・KPI・レポート・予測・ランク集計・ショップのマイページは
-- すべて deleted_at IS NULL で絞っているため、これだけで集計から除外される。
-- データ自体は DB に残るので、必要になれば deleted_at を NULL に戻して復元可能。
--
-- 実行方法: Supabase SQL Editor に全文貼り付けて Run (1トランザクション)。
-- =========================================================================

BEGIN;

-- カットオフ: 2026-07-15 いっぱい (JST) まで = UTC 2026-07-15T15:00:00Z より前
-- (2026-07-15 16:47 JST の発注までがテストデータ対象)

-- 1. 対象の発注をアーカイブ
WITH archived_orders AS (
  UPDATE public.orders
  SET deleted_at = now()
  WHERE deleted_at IS NULL
    AND created_at < '2026-07-16 00:00:00+09'
  RETURNING id, product_id, status, confirmed_qty
),

-- 2. 在庫カウンタの補正
--    「確定」でアーカイブされる発注は products.ordered_qty に confirmed_qty が
--    加算済みのため、その分を戻す (テスト発注が在庫の発注済数を食い潰さないように)
stock_fix AS (
  UPDATE public.products p
  SET ordered_qty = GREATEST(0, p.ordered_qty - sub.qty),
      updated_at = now()
  FROM (
    SELECT product_id, SUM(COALESCE(confirmed_qty, 0)) AS qty
    FROM archived_orders
    WHERE status = '確定'
    GROUP BY product_id
  ) sub
  WHERE p.id = sub.product_id
  RETURNING p.id
),

-- 3. 対象の請求書をアーカイブ
--    a) 発行日が 7/15 以前のもの
--    b) 明細の発注が全てアーカイブ済みのもの (7/16 以降に発行した
--       テスト発注向けの保証金/精算/返金請求書も漏れなく拾う)
archived_invoices AS (
  UPDATE public.invoices i
  SET deleted_at = now()
  WHERE i.deleted_at IS NULL
    AND (
      i.issued_at < '2026-07-16 00:00:00+09'
      OR (
        EXISTS (SELECT 1 FROM public.invoice_items ii WHERE ii.invoice_id = i.id)
        AND NOT EXISTS (
          -- 「生きている発注」が1件も紐づかない請求書 = テスト発注だけの請求書
          -- (同一ステートメント内では orders の UPDATE が見えないため、
          --  archived_orders CTE を除外条件に含めて判定する)
          SELECT 1
          FROM public.invoice_items ii
          JOIN public.orders o ON o.id = ii.order_id
          WHERE ii.invoice_id = i.id
            AND o.deleted_at IS NULL
            AND o.id NOT IN (SELECT id FROM archived_orders)
        )
      )
    )
  RETURNING id, invoice_number
)

-- 4. 実行結果サマリ
SELECT
  (SELECT COUNT(*) FROM archived_orders)   AS archived_orders,
  (SELECT COUNT(*) FROM archived_invoices) AS archived_invoices,
  (SELECT COUNT(*) FROM stock_fix)         AS stock_adjusted_products;

COMMIT;

-- =========================================================================
-- 実行後の確認用 (任意)
-- =========================================================================
-- 残っている(=集計対象の)発注・請求が 7/16 以降だけになっているか:
--   SELECT MIN(created_at) FROM public.orders   WHERE deleted_at IS NULL;
--   SELECT MIN(issued_at)  FROM public.invoices WHERE deleted_at IS NULL;
--
-- アーカイブされた件数の内訳:
--   SELECT status, COUNT(*) FROM public.orders
--   WHERE deleted_at IS NOT NULL AND created_at < '2026-07-16 00:00:00+09'
--   GROUP BY status;
--
-- 復元したい場合 (例: 全件戻す):
--   UPDATE public.orders   SET deleted_at = NULL WHERE created_at < '2026-07-16 00:00:00+09';
--   UPDATE public.invoices SET deleted_at = NULL WHERE issued_at  < '2026-07-16 00:00:00+09';
--   ※ 復元時は products.ordered_qty の再加算も必要な点に注意
