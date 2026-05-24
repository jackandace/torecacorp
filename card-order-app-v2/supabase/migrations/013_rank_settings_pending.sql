-- =========================================================================
-- 013_rank_settings_pending.sql
-- リベート設定の月跨ぎ予約 + 変更ログ
--
-- 月途中で閾値・リベート率を変更しても、適用は翌月 1 日に行う。
-- 当月の集計や入金額に影響を与えないため。
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.rank_settings_changes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rank              text NOT NULL CHECK (rank IN ('platinum','gold','silver','bronze','standard')),
  old_threshold     integer NOT NULL,
  old_rebate_rate   numeric NOT NULL,
  new_threshold     integer NOT NULL CHECK (new_threshold >= 0),
  new_rebate_rate   numeric NOT NULL CHECK (new_rebate_rate >= 0 AND new_rebate_rate <= 1),
  effective_from    date NOT NULL,                  -- 適用日 (通常は翌月 1 日)
  status            text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','applied','failed','cancelled')),
  applied_at        timestamptz,
  error_detail      text,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rank_changes_pending
  ON public.rank_settings_changes(status, effective_from)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_rank_changes_recent
  ON public.rank_settings_changes(created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_rank_changes ON public.rank_settings_changes;
CREATE TRIGGER set_updated_at_rank_changes
  BEFORE UPDATE ON public.rank_settings_changes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.rank_settings_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rank_changes_super_admin" ON public.rank_settings_changes;
CREATE POLICY "rank_changes_super_admin" ON public.rank_settings_changes
  FOR ALL USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

COMMENT ON TABLE public.rank_settings_changes IS 'ランク閾値・リベート率の変更予約と適用履歴';
