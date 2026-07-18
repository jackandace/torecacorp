-- 026_suppliers.sql : 問屋(サプライヤー)基盤 — 納品基準・多問屋対応 フェーズ1
--
-- ・suppliers(問屋マスタ) / supplier_users(問屋ユーザー↔問屋)
-- ・products.supplier_id(どの問屋の商品か)
-- ・RLSヘルパ current_supplier_id() / is_supplier()
-- 問屋ロールは auth の user_metadata.role='supplier'。DB側の判定は supplier_users の存在で行う。

-- 1) 問屋マスタ
CREATE TABLE IF NOT EXISTS public.suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  code         text UNIQUE,            -- 短縮コード(A/B/C 等・任意)
  contact_name text,
  email        text,
  phone        text,
  address      text,
  active       boolean NOT NULL DEFAULT true,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

-- 2) 問屋ユーザー(1ユーザー=1問屋)
CREATE TABLE IF NOT EXISTS public.supplier_users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_users_supplier ON public.supplier_users(supplier_id);

-- 3) 商品に問屋を紐付け
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);

-- 4) RLS ヘルパ(SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.current_supplier_id() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT supplier_id FROM public.supplier_users WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_supplier() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.supplier_users WHERE user_id = auth.uid());
$$;

-- 5) RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suppliers_admin_all ON public.suppliers;
CREATE POLICY suppliers_admin_all ON public.suppliers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS suppliers_self_read ON public.suppliers;
CREATE POLICY suppliers_self_read ON public.suppliers
  FOR SELECT USING (id = public.current_supplier_id());

DROP POLICY IF EXISTS supplier_users_admin_all ON public.supplier_users;
CREATE POLICY supplier_users_admin_all ON public.supplier_users
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS supplier_users_self_read ON public.supplier_users;
CREATE POLICY supplier_users_self_read ON public.supplier_users
  FOR SELECT USING (user_id = auth.uid());

-- 6) products: 問屋は自社商品を閲覧可(既存のadmin/shopポリシーに追加=OR)
DROP POLICY IF EXISTS products_supplier_select ON public.products;
CREATE POLICY products_supplier_select ON public.products
  FOR SELECT USING (supplier_id = public.current_supplier_id());
