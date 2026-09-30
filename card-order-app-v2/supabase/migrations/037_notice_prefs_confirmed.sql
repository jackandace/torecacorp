-- =========================================================================
-- 037_notice_prefs_confirmed.sql — 2026-10-01
-- お知らせの受け取り設定を「お客様が確認した日時」を記録する。
--  - 未確認のお客様には、ログイン後に受け取り設定の確認ポップアップを出す
--  - 新商品のまとめメールは、確認して「受け取る」を選んだお客様にだけ送る
--    (確認前は送らない = いきなりメールが届いて迷惑・混乱にならないように)
-- Supabase SQL Editor で手動実行。
-- =========================================================================
ALTER TABLE public.shop_notice_prefs ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- 既に受け取り設定画面で保存済みのお客様は確認済みとみなす
UPDATE public.shop_notice_prefs
   SET confirmed_at = updated_at
 WHERE confirmed_at IS NULL
   AND updated_at > '2026-01-01';
