-- 029_forecast_snapshots.sql : 予実の自動締め(フェーズD)
-- 月初に予測を凍結保存し、月末に実績(納品=収益認識)と突合して差異を記録する。

CREATE TABLE IF NOT EXISTS public.forecast_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_month    text NOT NULL,          -- 予測対象月 'YYYY-MM'
  forecast_amount bigint NOT NULL,         -- 月初に凍結した予測(税抜)
  actual_amount   bigint,                  -- 実績(収益認識・締め後)
  variance        bigint,                  -- actual - forecast
  snapshot_at     timestamptz NOT NULL DEFAULT now(),
  closed_at       timestamptz,             -- 実績確定日時
  UNIQUE (target_month)
);

ALTER TABLE public.forecast_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS forecast_snapshots_admin ON public.forecast_snapshots;
CREATE POLICY forecast_snapshots_admin ON public.forecast_snapshots
  FOR SELECT USING (public.is_admin());
