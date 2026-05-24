-- =========================================================================
-- 011_staff_tasks.sql
-- スタッフ管理 + タスク管理
--
-- staff_profiles: auth.users の補助情報 (表示名・部署など)
-- staff_tasks:    社内タスク (請求書発行 / 出荷通知 / 宣誓書送付 等)
-- =========================================================================

-- スタッフ補助情報
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  department   text,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at_staff_profiles ON public.staff_profiles;
CREATE TRIGGER set_updated_at_staff_profiles
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_profiles_admin_all" ON public.staff_profiles;
CREATE POLICY "staff_profiles_admin_all" ON public.staff_profiles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 自分のプロフィールは本人も読取可
DROP POLICY IF EXISTS "staff_profiles_self_read" ON public.staff_profiles;
CREATE POLICY "staff_profiles_self_read" ON public.staff_profiles
  FOR SELECT USING (user_id = auth.uid());

-- タスク
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  description         text,
  category            text NOT NULL DEFAULT 'other'
                      CHECK (category IN ('invoice','shipment','oath','survey','inventory','onboarding','other')),
  status              text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','in_progress','done','cancelled')),
  priority            text NOT NULL DEFAULT 'normal'
                      CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  related_shop_id     uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  related_invoice_id  uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  related_order_id    uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  due_date            date,
  completed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status
  ON public.staff_tasks(assigned_to, status, due_date)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status_due
  ON public.staff_tasks(status, due_date)
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS set_updated_at_staff_tasks ON public.staff_tasks;
CREATE TRIGGER set_updated_at_staff_tasks
  BEFORE UPDATE ON public.staff_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_tasks_admin_all" ON public.staff_tasks;
CREATE POLICY "staff_tasks_admin_all" ON public.staff_tasks
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 同 user_id + month 重複防止用に既に作った shop_rank_history のユニーク制約は別件で OK
