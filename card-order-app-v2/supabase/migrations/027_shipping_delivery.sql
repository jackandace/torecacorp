-- 027_shipping_delivery.sql : 問屋の出荷/納品/ショップ受領 (フェーズ2-3)
--
-- orders に出荷会社・納品完了日(=収益認識日)・受領確認・受領用トークンを追加。
-- 問屋の書き込みは API で supplier_id スコープを検証して行うため、orders の
-- supplier 向け RLS は付けない(サービスロール経由 + 明示スコープ)。

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS carrier                  text,          -- 配送会社
  ADD COLUMN IF NOT EXISTS delivered_at             timestamptz,   -- 納品完了日 = 収益認識日 (フェーズ3)
  ADD COLUMN IF NOT EXISTS received_at              timestamptz,   -- ショップ受領確認日 (フェーズ3)
  ADD COLUMN IF NOT EXISTS receipt_token            text,          -- 受領確認メール用トークン
  ADD COLUMN IF NOT EXISTS receipt_token_expires_at timestamptz;

-- トークンは一意 (nullは複数可)
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_receipt_token
  ON public.orders(receipt_token) WHERE receipt_token IS NOT NULL;

-- 収益認識レポート/未受領抽出用
CREATE INDEX IF NOT EXISTS idx_orders_delivered_at ON public.orders(delivered_at) WHERE delivered_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_unreceived
  ON public.orders(shop_id) WHERE delivered_at IS NOT NULL AND received_at IS NULL;
