-- =========================================================================
-- 009_shops_email_optional.sql
-- ショップの email を任意化 (Auth ユーザー未紐付けの仮登録を許容)
--
-- Google フォームに未回答 / メアドなしで管理開始したいショップを
-- 名前だけで先に登録し、後からメアドを追記して招待メール送信できるようにする。
-- =========================================================================

-- email を NULL 許容に
ALTER TABLE public.shops
  ALTER COLUMN email DROP NOT NULL;

-- UNIQUE 制約は保持しつつ、複数 NULL を許容するため部分インデックス化
-- 既存制約名を取得して削除
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.shops'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%(email)%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.shops DROP CONSTRAINT %I', cname);
  END IF;
END $$;

-- email IS NOT NULL の場合のみ unique を効かせる
CREATE UNIQUE INDEX IF NOT EXISTS uq_shops_email_notnull
  ON public.shops (email)
  WHERE email IS NOT NULL AND deleted_at IS NULL;
