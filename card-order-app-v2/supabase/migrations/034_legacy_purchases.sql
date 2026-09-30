-- =========================================================================
-- 034_legacy_purchases.sql
-- 卸アプリ運用以前の購入履歴 (参照専用) — 2026-09-30
--
-- アプリの発注 (orders) とは別テーブル。ランク・リベート・請求・在庫・
-- レポート・累計取引額 (shops.lifetime_amount) の計算には一切使わない。
-- ショップへの表示はサーバ側 (Service Role) で必要な列だけを返すため、
-- RLS は admin のみ (社内メモ internal_note をショップに漏らさない)。
-- Supabase SQL Editor で手動実行。
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.legacy_purchases (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  purchased_on      date NOT NULL,                 -- 購入日
  product_name      text NOT NULL,                 -- 商品名 (商品マスタとは紐付けない)
  quantity          integer NOT NULL CHECK (quantity > 0),
  unit              text NOT NULL DEFAULT 'BOX',   -- BOX / CT / パック / 個 / セット
  unit_price        integer NOT NULL CHECK (unit_price >= 0),  -- 単価 (税抜・円)
  amount            integer NOT NULL CHECK (amount >= 0),      -- 購入金額 (税抜・円)
  shipment_status   text NOT NULL DEFAULT 'shipped' CHECK (shipment_status IN ('shipped','unshipped')),
  note              text,                          -- 備考 (ショップにも表示)
  internal_note     text,                          -- 社内メモ (ショップには非表示)
  legacy_invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL, -- 将来: 過去請求書PDFとの紐付け用
  import_batch_id   uuid,                          -- 一括取込の単位 (取込ごとの取り消し用)
  created_by        uuid,
  updated_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_legacy_purchases_shop  ON public.legacy_purchases(shop_id, purchased_on DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_legacy_purchases_batch ON public.legacy_purchases(import_batch_id) WHERE import_batch_id IS NOT NULL;

ALTER TABLE public.legacy_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_legacy_purchases" ON public.legacy_purchases;
CREATE POLICY "admin_all_legacy_purchases" ON public.legacy_purchases
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_legacy_purchases_updated_at ON public.legacy_purchases;
CREATE TRIGGER trg_legacy_purchases_updated_at
  BEFORE UPDATE ON public.legacy_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
