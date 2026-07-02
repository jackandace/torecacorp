-- =========================================================================
-- 021_rank_lifetime_floor.sql
-- ランク判定を「月次昇格 + 累計下限」のハイブリッドにするための
-- 累計下限しきい値 (lifetime_threshold) を rank_settings に追加。
--   shop.lifetime_amount >= rank.lifetime_threshold のとき、そのランクを
--   最低保証(フロア)として付与する。0 = フロア無効。
-- Supabase SQL Editor で手動実行。
-- =========================================================================

ALTER TABLE public.rank_settings
  ADD COLUMN IF NOT EXISTS lifetime_threshold integer NOT NULL DEFAULT 0
  CHECK (lifetime_threshold >= 0);

COMMENT ON COLUMN public.rank_settings.lifetime_threshold IS '累計取引額の下限しきい値 (0=無効)。累計がこれ以上なら当該ランクを最低保証';
