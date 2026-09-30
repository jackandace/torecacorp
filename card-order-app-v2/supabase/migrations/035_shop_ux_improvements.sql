-- =========================================================================
-- 035_shop_ux_improvements.sql — 2026-10-01
-- お客様要望 (卸アプリ改善希望) 対応のDB変更をまとめたもの。Supabase SQL Editor で手動実行。
--
--  A. 発注履歴で商品名が「—」になる不具合の修正
--     ショップは公開中の商品しか読めない (RLS) ため、商品を非公開にすると発注履歴の
--     商品名 join が空になっていた。発注時点の商品名・型番を orders に保存する。
--  B. 商品の発売日 (release_date) を正式な項目にする
--  C. アプリ内お知らせ
--     - products.published_at: 初めてショップに公開された日時 (新着商品の判定用)
--     - announcements: 全体向けのお知らせ (管理者が投稿)
--     - shop_notification_reads: タブごとの既読位置 (未読件数の計算用)
-- =========================================================================

-- ---------- A. 発注の商品名スナップショット ----------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_title        text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_model_number text;

-- 既存の発注: 現在の商品名で埋める (データの上書きではなく空欄の補完のみ)
UPDATE public.orders o
   SET product_title = p.title,
       product_model_number = p.model_number
  FROM public.products p
 WHERE o.product_id = p.id
   AND o.product_title IS NULL;

-- 新規の発注: どの経路で作られても発注時点の商品名を保存する
CREATE OR REPLACE FUNCTION public.orders_snapshot_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.product_title IS NULL THEN
    SELECT p.title, p.model_number INTO NEW.product_title, NEW.product_model_number
      FROM public.products p WHERE p.id = NEW.product_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_snapshot_product ON public.orders;
CREATE TRIGGER trg_orders_snapshot_product
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.orders_snapshot_product();

-- ---------- B. 発売日 ----------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS release_date date;

-- 問屋の入荷登録で release_info に「発売日: YYYY-MM-DD」と入れていた分を移す
UPDATE public.products
   SET release_date = (substring(release_info from '発売日[:：]\s*(\d{4}-\d{2}-\d{2})'))::date
 WHERE release_date IS NULL
   AND release_info ~ '発売日[:：]\s*\d{4}-\d{2}-\d{2}';

-- ---------- C-1. 新着商品の判定用: 初公開日時 ----------
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- 既存の公開中商品は作成日時を初公開日時とみなす (既読位置の初期化で未読にはならない)
UPDATE public.products SET published_at = created_at
 WHERE published_at IS NULL AND is_visible = true AND deleted_at IS NULL;

-- 公開 (is_visible が true になった) 初回だけ記録する。管理画面・承認・一括操作・取込のどの経路でも効く
CREATE OR REPLACE FUNCTION public.products_mark_published()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_visible = true AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_mark_published ON public.products;
CREATE TRIGGER trg_products_mark_published
  BEFORE INSERT OR UPDATE OF is_visible ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_mark_published();

CREATE INDEX IF NOT EXISTS idx_products_published_at ON public.products(published_at DESC) WHERE deleted_at IS NULL;

-- ---------- C-2. 全体向けのお知らせ ----------
CREATE TABLE IF NOT EXISTS public.announcements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  body        text,
  link_url    text,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON public.announcements(created_at DESC) WHERE deleted_at IS NULL;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "announcements_read"  ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin" ON public.announcements;
CREATE POLICY "announcements_read" ON public.announcements
  FOR SELECT USING (deleted_at IS NULL OR public.is_admin());
CREATE POLICY "announcements_admin" ON public.announcements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- C-3. タブごとの既読位置 ----------
CREATE TABLE IF NOT EXISTS public.shop_notification_reads (
  shop_id          uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  general_seen_at  timestamptz NOT NULL DEFAULT now(),  -- 全体へのお知らせ
  personal_seen_at timestamptz NOT NULL DEFAULT now(),  -- あなたへのお知らせ
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_notification_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_shop_notification_reads" ON public.shop_notification_reads;
CREATE POLICY "admin_all_shop_notification_reads" ON public.shop_notification_reads
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- (ショップの読み書きはサーバ側で本人確認のうえ Service Role で行う)

-- リリース時点では既存の通知・商品を既読扱いにする (いきなり大量の未読が出ないように)
INSERT INTO public.shop_notification_reads (shop_id)
SELECT id FROM public.shops WHERE deleted_at IS NULL
ON CONFLICT (shop_id) DO NOTHING;

-- ---------- D. お知らせ機能の先行公開 (テストユーザーのみ) ----------
-- 全体反映前は is_beta_tester = true のショップだけにお知らせ機能 (🔔・タブ) を表示する。
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_beta_tester boolean NOT NULL DEFAULT false;
-- 初期テストユーザー: 鈴木テスト商店
UPDATE public.shops SET is_beta_tester = true
 WHERE email = 'ja.project93@gmail.com' AND deleted_at IS NULL;

-- ---------- E. タイトル (ポケモン / ワンピース / ヴァイス …) の括り ----------
-- products.series は表記ゆれが多い (「デュエルマスターズ」「デュエル・マスターズTCG」等) ため、
-- キーワードで「タイトル」に括る。どのキーワードにも当たらないシリーズの商品が追加されたら、
-- そのシリーズ名でタイトルを自動追加する (管理画面でキーワードを足せば後から統合できる)。
CREATE TABLE IF NOT EXISTS public.product_titles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  keywords     text[] NOT NULL DEFAULT '{}',
  sort_order   integer NOT NULL DEFAULT 100,
  auto_created boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_titles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_titles_read"  ON public.product_titles;
DROP POLICY IF EXISTS "product_titles_admin" ON public.product_titles;
CREATE POLICY "product_titles_read"  ON public.product_titles FOR SELECT USING (true);
CREATE POLICY "product_titles_admin" ON public.product_titles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS title_group_id uuid REFERENCES public.product_titles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_title_group ON public.products(title_group_id);

-- 初期タイトル (実データのシリーズ表記を元に作成)
INSERT INTO public.product_titles (name, keywords, sort_order) VALUES
  ('ポケモンカード',            ARRAY['ポケモン','ポケカ','pokemon'], 10),
  ('ワンピースカード',          ARRAY['ワンピース','onepiece'], 20),
  ('ユニオンアリーナ',          ARRAY['ユニオンアリーナ','unionarena'], 30),
  ('遊戯王',                    ARRAY['遊戯王'], 40),
  ('デュエル・マスターズ',      ARRAY['デュエルマスターズ','デュエマ'], 50),
  ('ヴァイスシュヴァルツ',      ARRAY['ヴァイス'], 60),
  ('ドラゴンボール',            ARRAY['ドラゴンボール'], 70),
  ('デジモン',                  ARRAY['デジモン'], 80),
  ('ヴァンガード',              ARRAY['ヴァンガード','先導者'], 90),
  ('ディズニー・ロルカナ',      ARRAY['ロルカナ','lorcana'], 100),
  ('マジック：ザ・ギャザリング', ARRAY['マジック','ギャザリング','mtg'], 110),
  ('ガンダム',                  ARRAY['ガンダム'], 120),
  ('バトルスピリッツ',          ARRAY['バトルスピリッツ','バトスピ'], 130),
  ('ラブライブ！',              ARRAY['ラブライブ'], 140),
  ('hololive OFFICIAL CARD GAME', ARRAY['hololive','ホロライブ'], 150),
  ('ウルトラマン',              ARRAY['ウルトラマン'], 160),
  ('Shadowverse EVOLVE',        ARRAY['shadowverse','シャドウバース'], 170),
  ('名探偵コナン',              ARRAY['コナン'], 180),
  ('リセ',                      ARRAY['リセ','lycee'], 190),
  ('ビルディバイド',            ARRAY['ビルディバイド'], 200),
  ('ゼクス',                    ARRAY['ゼクス','z/x'], 210),
  ('ウィクロス',                ARRAY['ウィクロス','wixoss'], 220),
  ('Reバース',                  ARRAY['reバース','re:バース'], 230),
  ('五等分の花嫁',              ARRAY['五等分'], 240),
  ('プロ野球カードゲーム',      ARRAY['プロ野球','ファンスターズリーグ','dreamorder'], 250),
  ('ゴジラ',                    ARRAY['ゴジラ'], 260),
  ('DIVINE CROSS',              ARRAY['divinecross'], 270)
ON CONFLICT (name) DO NOTHING;

-- 表記ゆれ吸収: NFKC (全角英数→半角) + 小文字 + 空白・中黒・記号の一部を除去
CREATE OR REPLACE FUNCTION public.title_norm(t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(lower(normalize(coalesce(t, ''), NFKC)), '[\s・･\-_!！]', '', 'g')
$$;

-- シリーズ → 商品名の順でキーワード一致を探す。見つからずシリーズがあればタイトルを自動追加
CREATE OR REPLACE FUNCTION public.resolve_product_title(p_series text, p_title text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
  v_name text;
BEGIN
  IF public.title_norm(p_series) <> '' THEN
    SELECT t.id INTO v_id FROM public.product_titles t
     WHERE EXISTS (SELECT 1 FROM unnest(t.keywords) k
                    WHERE public.title_norm(k) <> '' AND public.title_norm(p_series) LIKE '%' || public.title_norm(k) || '%')
     ORDER BY t.sort_order, t.created_at LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  IF public.title_norm(p_title) <> '' THEN
    SELECT t.id INTO v_id FROM public.product_titles t
     WHERE EXISTS (SELECT 1 FROM unnest(t.keywords) k
                    WHERE public.title_norm(k) <> '' AND public.title_norm(p_title) LIKE '%' || public.title_norm(k) || '%')
     ORDER BY t.sort_order, t.created_at LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  -- 未登録のタイトル → シリーズ名で自動追加
  v_name := btrim(regexp_replace(normalize(coalesce(p_series, ''), NFKC), '\s+', ' ', 'g'));
  IF v_name = '' THEN RETURN NULL; END IF;
  INSERT INTO public.product_titles (name, keywords, sort_order, auto_created)
  VALUES (v_name, ARRAY[v_name], 900, true)
  ON CONFLICT (name) DO NOTHING;
  SELECT id INTO v_id FROM public.product_titles WHERE name = v_name;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.products_assign_title()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.title_group_id := public.resolve_product_title(NEW.series, NEW.title);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_products_assign_title ON public.products;
CREATE TRIGGER trg_products_assign_title
  BEFORE INSERT OR UPDATE OF series, title ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_assign_title();

-- 管理画面でキーワードを変えた後の再分類用
CREATE OR REPLACE FUNCTION public.reassign_product_titles()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  -- SECURITY DEFINER 内では current_user が所有者になるため、呼び出し元は JWT のロールで判定する
  IF NOT (public.is_admin() OR coalesce(auth.role(), '') = 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.products SET title_group_id = public.resolve_product_title(series, title) WHERE deleted_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- 既存商品を分類 (未分類シリーズのタイトル自動追加も含む)
UPDATE public.products SET title_group_id = public.resolve_product_title(series, title) WHERE deleted_at IS NULL;

-- ---------- F. お知らせの受け取り設定 + 新商品メール (1日1回まとめ) ----------
CREATE TABLE IF NOT EXISTS public.shop_notice_prefs (
  shop_id          uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  email_enabled    boolean NOT NULL DEFAULT true,    -- 新商品のまとめメールを受け取る
  title_mode       text NOT NULL DEFAULT 'all' CHECK (title_mode IN ('all', 'selected')),
  title_ids        uuid[] NOT NULL DEFAULT '{}',     -- title_mode = 'selected' のときの希望タイトル
  last_digest_at   timestamptz,                      -- 最後にまとめメールの対象にした時刻
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_notice_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_shop_notice_prefs" ON public.shop_notice_prefs;
CREATE POLICY "admin_all_shop_notice_prefs" ON public.shop_notice_prefs
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
-- (ショップの読み書きはサーバ側で本人確認のうえ Service Role で行う)
