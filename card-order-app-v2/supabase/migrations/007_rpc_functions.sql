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
