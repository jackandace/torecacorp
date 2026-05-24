# Supabase セットアップ手順

トレカ商事カンパニー v2 を実 Supabase に接続するまでの一発完走ガイド。
所要時間: **約 15 分**

---

## 全体の流れ

1. プロジェクト作成（オーガニゼーション配下に新規）
2. マイグレーション SQL を流す
3. Storage バケットを作る + ポリシーを設定
4. 自分のメールアドレスを admin に昇格
5. `.env.local` を実値に差し替え
6. `npm run dev` で起動・動作確認

---

## 1. プロジェクト作成

1. https://supabase.com にログインし、対象オーガニゼーションを選択
2. **New project** をクリック
3. 設定値:
   - **Name**: `torecacorp-prod` (任意)
   - **Database Password**: 強力なパスワードを生成し、安全な場所に保管
   - **Region**: `Northeast Asia (Tokyo)` 推奨
   - **Pricing Plan**: Free でも開始可能。本番運用するなら Pro 推奨
4. 作成完了まで 1〜2 分待つ

## 2. マイグレーション SQL を流す

1. プロジェクトを開き、左メニュー **SQL Editor** → **New query**
2. [supabase/setup/all-migrations.sql](supabase/setup/all-migrations.sql) の **全文** を貼り付け
3. **Run** をクリック（約 5〜10 秒で完了）

> 個別に流したい場合は [supabase/migrations/](supabase/migrations/) を 001 → 008 の順に実行しても OK。

## 3. Storage バケット

### 3-a. バケット作成

`SQL Editor` で [supabase/setup/storage-buckets.sql](supabase/setup/storage-buckets.sql) の全文を実行。

### 3-b. RLS ポリシー（推奨: GUI で確認）

左メニュー **Storage** → 各バケット → **Policies** で以下を確認:

| バケット | 推奨ポリシー |
|---|---|
| `product-images` | SELECT: public / その他: authenticated `is_admin()` |
| `invoices` | SELECT: 該当ショップのみ / その他: admin のみ |
| `oath-documents` | 全操作 admin のみ |
| `survey-reports` | 全操作 admin のみ |

`storage-buckets.sql` で SQL ポリシーは投入済みなので、GUI で「policies が 4 件あること」を見れば OK。

## 4. 自分を admin に昇格

### 4-a. Auth ユーザーを作る

左メニュー **Authentication** → **Users** → **Add user** → **Send invitation**
（メールで招待リンクが届くので、パスワード設定を済ます）

### 4-b. ロール付与

`SQL Editor` で [supabase/setup/promote-admin.sql](supabase/setup/promote-admin.sql) を開き、
`<YOUR_EMAIL@example.com>` を **3 箇所** あなたのメールに置換して Run。

確認クエリで `role: super_admin` が返れば成功。

## 5. `.env.local` を実値に

### 5-a. API キーを取得

左メニュー **Project Settings** → **API**:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY` （**絶対に公開しない**）

### 5-b. 反映

```bash
cd card-order-app-v2
cp .env.local.example .env.local  # 既にあれば編集のみ
```

`.env.local` を編集し、上記 3 値を差し替え。
`CRON_SECRET` は任意の長いランダム文字列に。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
RESEND_API_KEY=re_placeholder   # まだなくて OK (通知はスキップされる)
CRON_SECRET=$(openssl rand -hex 32 で生成)
NEXT_PUBLIC_APP_URL=http://localhost:3000
INVOICE_ISSUER_NAME=PALETTE GROUP トレカ商事カンパニー
INVOICE_REGISTRATION_NUMBER=T0000000000000
```

## 6. 起動・動作確認

```bash
npm run dev
```

http://localhost:3000 にアクセス → ログイン画面 → さきほど招待したメール/パスワードでログイン → `/admin` に飛べば成功 ✅

### 動作確認チェックリスト

- [ ] `/admin` にアクセスでき、ダッシュボードが表示される
- [ ] `/admin/inventory/new` で商品を 1 件作れる
- [ ] `/admin/shops/new` でテストショップを作れる（招待メールを送らない設定で）
- [ ] `/api/health` が `{ status: "ok", db: "connected" }` を返す
- [ ] `/admin/audit` に上記操作のログが記録されている

## 7. 検証 SQL（任意）

[supabase/setup/verify.sql](supabase/setup/verify.sql) を SQL Editor で実行すると、
テーブル数 / RLS / 関数 / 初期データ / バケット / admin ユーザーが期待どおり揃っているか確認できます。

---

## 詰まったら

| 症状 | 対処 |
|---|---|
| `/admin` で 403 / リダイレクトされる | ロール未付与。手順 4-b を再実行 |
| 商品一覧が空 | RLS が効いている。手順 4-b でロール付与後に再ログイン |
| 画像アップロード失敗 | Storage ポリシー未設定。手順 3-b 確認 |
| 通知メールが送られない | `RESEND_API_KEY` 未設定。テンプレート送信ログに `skipped` と記録される (動作上の問題はなし) |
| Cron が動かない | ローカルでは動きません。Vercel デプロイ後に Cron が走る |

---

## オプション: ステージング環境

本番とは別にもう 1 つ Supabase プロジェクトを作り、Vercel の Preview Deploy に紐付けると、
PR ごとに本番に影響なくテストできます。設計はそのままで、`.env.local` の値を差し替えるだけ。
