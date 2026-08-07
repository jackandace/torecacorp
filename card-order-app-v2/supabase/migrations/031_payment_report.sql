-- =========================================================================
-- 031_payment_report.sql
-- ショップの「振込完了報告」対応 (2026-08-07)
--
-- 「支払い確認中」は独立フィールドから導出する表示専用ステータス:
--   payment_reported_at IS NOT NULL AND status <> '入金済み'
-- invoices.status の CHECK 制約・既存の集計/精算ロジックには一切影響しない。
-- Supabase SQL Editor で手動実行。
-- =========================================================================

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_reported_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS payment_report_note text NULL;

COMMENT ON COLUMN public.invoices.payment_reported_at IS
  'ショップが「振込完了を報告」した日時。status<>入金済み の間は「支払い確認中」として表示。管理者はクリア可能。';
COMMENT ON COLUMN public.invoices.payment_report_note IS
  '振込報告時の任意メモ (振込名義が異なる場合など)';

-- 管理画面「確認中」タブの絞り込み用 (報告済み かつ 未消込 のみの部分インデックス)
CREATE INDEX IF NOT EXISTS idx_invoices_payment_reported
  ON public.invoices (payment_reported_at)
  WHERE payment_reported_at IS NOT NULL AND status <> '入金済み';
