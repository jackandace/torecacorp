-- =========================================================================
-- 003_triggers.sql
-- updated_at 自動更新トリガー
-- =========================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 対象テーブルにトリガーを設定
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'shops',
    'products',
    'orders',
    'invoices',
    'rank_settings',
    'surveys',
    'notification_templates'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at_%I ON public.%I;', t, t
    );
    EXECUTE format(
      'CREATE TRIGGER set_updated_at_%I
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;
