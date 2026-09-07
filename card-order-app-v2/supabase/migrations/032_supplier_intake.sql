-- =========================================================================
-- 032_supplier_intake.sql
-- フェーズ4: 問屋による入荷登録 (下書き → 管理者承認公開) + テストモード
--
-- ・suppliers.is_test: テスト問屋フラグ。このフラグが立つ問屋の登録データは
--   承認(公開)できず、ショップには一切表示されない (入力練習・検証用)。
-- ・products.intake_note: 問屋が登録時に添えるメモ (承認者向け)
-- ・承認待ちの判定は「is_approved = false AND supplier_id IS NOT NULL」で導出
--   (管理者が直接作成する商品は従来どおり)
-- Supabase SQL Editor で手動実行。
-- =========================================================================

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.suppliers.is_test IS
  'テスト問屋。true の問屋の登録商品は承認・公開できない (本番データに混入しない)';

-- テスト問屋(検証用) にフラグを立てる (code=TEST)
UPDATE public.suppliers SET is_test = true WHERE code = 'TEST';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS intake_note text NULL;

COMMENT ON COLUMN public.products.intake_note IS
  '問屋の入荷登録時のメモ (承認者向け・ショップには表示しない)';

CREATE INDEX IF NOT EXISTS idx_products_intake_pending
  ON public.products (supplier_id)
  WHERE is_approved = false AND supplier_id IS NOT NULL AND deleted_at IS NULL;
