-- =========================================================================
-- 036_staff_testers_and_notice_start.sql — 2026-09-30
--  A. 管理者 = テストユーザー
--     スタッフ (auth.users の role が admin / super_admin) のメールアドレス、またはその
--     「+」付き別名 (例: m.kawazu+shop@torecacorp.jp) で作ったショップを自動でテストユーザー扱いにする。
--     手動のテストユーザー指定 (shops.is_beta_tester) も引き続き有効。
--  B. 過去分を絶対に通知しないための補強
--     035 では「公開中」の既存商品にだけ公開日時を補完した。今は非公開でも過去に公開していた
--     商品 (発注実績がある / 終了) にも過去の公開日時を入れ、再公開しても「新商品」扱いにならないようにする。
-- Supabase SQL Editor で手動実行。
-- =========================================================================

-- ---------- A. スタッフ別名のテストユーザー判定 ----------
-- メールアドレスの「+」以降を外して比較用に正規化 (例: M.Kawazu+shop@X.jp → m.kawazu@x.jp)
CREATE OR REPLACE FUNCTION public.email_base(e text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN e IS NULL OR position('@' in e) = 0 THEN NULL
    ELSE split_part(split_part(lower(btrim(e)), '@', 1), '+', 1) || '@' || split_part(lower(btrim(e)), '@', 2) END
$$;

-- テストユーザーのショップ一覧 (手動指定 + スタッフ別名)。Service Role からのみ呼ぶ
CREATE OR REPLACE FUNCTION public.tester_shop_ids()
RETURNS TABLE (shop_id uuid, reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  WITH staff AS (
    SELECT DISTINCT public.email_base(u.email) AS base
      FROM auth.users u
      LEFT JOIN public.staff_profiles sp ON sp.user_id = u.id
     WHERE u.raw_user_meta_data->>'role' IN ('admin', 'super_admin')
       AND coalesce(sp.active, true)
       AND u.email IS NOT NULL
  )
  SELECT s.id,
         CASE WHEN s.is_beta_tester THEN 'manual' ELSE 'staff' END
    FROM public.shops s
   WHERE s.deleted_at IS NULL
     AND (s.is_beta_tester OR public.email_base(s.email) IN (SELECT base FROM staff));
$$;

CREATE OR REPLACE FUNCTION public.shop_is_tester(p_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT EXISTS (SELECT 1 FROM public.tester_shop_ids() t WHERE t.shop_id = p_shop_id);
$$;

-- スタッフのメールアドレスを返すため、一般ユーザー (anon / authenticated) からは呼べないようにする
REVOKE ALL ON FUNCTION public.tester_shop_ids() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.shop_is_tester(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tester_shop_ids() TO service_role;
GRANT EXECUTE ON FUNCTION public.shop_is_tester(uuid) TO service_role;

-- ---------- B. 過去に公開していた商品の公開日時を補完 ----------
-- 公開日時が空で、発注実績がある or 終了済みの商品 = 過去にショップへ公開していた商品
UPDATE public.products p
   SET published_at = p.created_at
 WHERE p.published_at IS NULL
   AND p.created_at < now()
   AND (p.status = '終了' OR EXISTS (SELECT 1 FROM public.orders o WHERE o.product_id = p.id));
