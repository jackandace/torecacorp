-- =========================================================================
-- 管理者ユーザー昇格 SQL
-- =========================================================================
-- 前提: Supabase Dashboard > Authentication > Users から
--       メールアドレスでユーザーを作成 (Invite or Create) 済みであること
--
-- 下記の <YOUR_EMAIL@example.com> を実値に置き換えて Run してください。
-- =========================================================================

-- super_admin に昇格 (全機能 + ランク閾値変更可能)
UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"super_admin"}'::jsonb
WHERE email = '<YOUR_EMAIL@example.com>';

-- 確認
SELECT email, raw_user_meta_data->>'role' AS role
FROM auth.users
WHERE email = '<YOUR_EMAIL@example.com>';

-- =========================================================================
-- 一般 admin (リベート設定の変更だけ不可) にしたい場合:
-- =========================================================================
-- UPDATE auth.users
-- SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
-- WHERE email = '<STAFF_EMAIL@example.com>';

-- =========================================================================
-- ロール解除 (shop に戻す)
-- =========================================================================
-- UPDATE auth.users
-- SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) - 'role'
-- WHERE email = '<EMAIL@example.com>';
