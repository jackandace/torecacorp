# トレカ商事カンパニー 卸受発注・請求一元管理システム (v2)

PALETTE GROUP / トレカ商事カンパニー の卸取引を一元化する Web アプリケーション。
旧 GAS ベース [`card-order-app`](../card-order-app/) の後継として段階移行する。

## 技術スタック

| 領域            | 採用技術                                           |
| --------------- | ------------------------------------------------- |
| フレームワーク  | Next.js 14 (App Router) + TypeScript              |
| データベース    | Supabase (PostgreSQL)                             |
| 認証            | Supabase Auth (Email + Password)                  |
| ストレージ      | Supabase Storage (商品画像・請求書・宣誓書)        |
| メール          | Resend                                            |
| PDF             | @react-pdf/renderer                               |
| Excel パース    | SheetJS (xlsx)                                    |
| エラー監視      | Sentry                                            |
| スタイル        | Tailwind CSS                                      |
| デプロイ        | Vercel (Cron Jobs 対応)                           |

## ディレクトリ構成

```
card-order-app-v2/
├── middleware.ts                    # ルートガード (login/admin 分離)
├── next.config.mjs                  # Sentry ラップ
├── vercel.json                      # Cron 設定 (毎月 1 日 00:00 UTC)
├── sentry.*.config.ts               # Sentry init (client/server/edge)
├── supabase/migrations/
│   ├── 001_initial_schema.sql       # 全テーブル定義
│   ├── 002_indexes.sql              # 検索性能インデックス
│   ├── 003_triggers.sql             # updated_at 自動更新
│   ├── 004_rls_policies.sql         # Row Level Security
│   ├── 005_seed.sql                 # rank_settings & 通知テンプレート初期データ
│   ├── 006_storage_buckets.sql      # Storage バケット作成
│   └── 007_rpc_functions.sql        # 在庫増減 RPC など
├── src/
│   ├── app/
│   │   ├── layout.tsx               # ルートレイアウト
│   │   ├── page.tsx                 # ロール判定 → /admin or /mypage
│   │   ├── login/                   # ログイン画面
│   │   ├── (shop)/                  # ショップ画面 (order, mypage)
│   │   ├── admin/                   # 管理者画面 9 種
│   │   └── api/                     # API ルート
│   │       ├── health/
│   │       ├── cron/rank-update/    # 月次ランク更新バッチ
│   │       ├── orders/              # 発注作成 + ステータス更新 + CSV
│   │       ├── invoices/            # 請求書発行 + CSV
│   │       ├── products/import/     # Excel 取込
│   │       ├── shops/export/        # CSV
│   │       └── rank-settings/       # ランク設定更新 (super_admin)
│   ├── components/                  # 共有 UI
│   ├── constants/
│   │   └── ranks.ts                 # ランク定数 & 既定値
│   ├── lib/
│   │   ├── auth.ts                  # ロール判定
│   │   ├── audit.ts                 # 操作ログ書込
│   │   ├── csv.ts                   # CSV シリアライズ
│   │   ├── dates.ts                 # 日付ユーティリティ
│   │   ├── invoice-number.ts        # INV-YYYYMM-NNNN 採番
│   │   ├── orders.ts                # 数量バリデーション
│   │   ├── ranks.ts                 # 昇降格判定ロジック
│   │   ├── rebate.ts                # 掛け率 / リベート / 税計算
│   │   ├── storage.ts               # Storage 署名付き URL
│   │   ├── email/                   # Resend 送信
│   │   ├── pdf/                     # @react-pdf 用テンプレート
│   │   └── supabase/                # クライアント生成
│   └── types/database.ts            # Supabase スキーマ型
└── .env.local.example
```

## セットアップ

### 1. 依存インストール

```bash
cd card-order-app-v2
npm install
```

### 2. Supabase プロジェクト作成

**初回セットアップは [SUPABASE_SETUP.md](SUPABASE_SETUP.md) の手順に従ってください**
（プロジェクト作成 → マイグレーション → Storage → 管理者昇格 → `.env.local` まで一発完走ガイド）。

簡易な要約:
1. supabase.com で新規プロジェクト
2. [supabase/setup/all-migrations.sql](supabase/setup/all-migrations.sql) を SQL Editor に貼って Run
3. [supabase/setup/storage-buckets.sql](supabase/setup/storage-buckets.sql) を実行
4. Authentication > Users で自分を招待 → [supabase/setup/promote-admin.sql](supabase/setup/promote-admin.sql) で super_admin 昇格

### 3. 環境変数

`.env.local.example` をコピーして `.env.local` を作成し、各値を埋める。

```bash
cp .env.local.example .env.local
```

| 変数                              | 用途                                                                 |
| --------------------------------- | -------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase プロジェクト URL                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase Anon Key                                                    |
| `SUPABASE_SERVICE_ROLE_KEY`       | Service Role (サーバーサイド専用)                                    |
| `RESEND_API_KEY`                  | Resend API キー                                                      |
| `CRON_SECRET`                     | Vercel Cron 認証用シークレット                                       |
| `INVOICE_ISSUER_NAME`             | 請求書発行元名                                                       |
| `INVOICE_REGISTRATION_NUMBER`     | インボイス登録番号                                                   |
| `NEXT_PUBLIC_SENTRY_DSN`          | Sentry DSN (省略可)                                                  |

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス。Supabase に管理ユーザーを作成し、`user_metadata.role = 'super_admin'` を設定すれば管理画面に入れる。

### 5. テスト / 型チェック

```bash
npm test            # vitest 一回実行
npm run test:watch  # vitest watch モード
npm run type-check  # tsc --noEmit
npm run lint        # next lint
```

CI は [.github/workflows/ci.yml](.github/workflows/ci.yml) で `card-order-app-v2/` 配下の変更時に上記をすべて回す。

## 認証・ロールについて

- ロールは `auth.users.raw_user_meta_data->>'role'` を真実とする
  - `super_admin` / `admin` / `shop` (デフォルト)
- RLS のポリシー関数 `public.is_admin()` / `public.is_super_admin()` が判定
- Next.js 側でも `src/lib/auth.ts` で同等の判定を実施
- 新規ショップは `shops.user_id` に Supabase Auth の user id を紐付けて登録

## 月次ランク更新バッチ

- `vercel.json` で毎月 1 日 00:00 UTC (= 09:00 JST) に `/api/cron/rank-update` を実行
- 認証ヘッダ: `Authorization: Bearer ${CRON_SECRET}`
- 評価対象: 先月の `仮確定 + 確定` 発注合計
- 冪等: 同月の再実行は `shop_rank_history` を upsert (`shop_id + month`)
- 手動実行は `/admin/rebate` 画面のボタンから

## フェーズ別実装ステータス

| フェーズ | 内容                       | 実装状況                  |
| -------- | -------------------------- | ------------------------- |
| Phase 1  | 基盤・認証・DB             | ✅ 完了                                            |
| Phase 2  | 商品・在庫管理             | ✅ 詳細編集 / 画像 / Excel 取込 / 新規作成         |
| Phase 3  | 発注フォーム               | ✅ カート / 免責 / リクエスト送信                  |
| Phase 4  | 受発注管理                 | ✅ 詳細 / 2フロー承認 / 発送 / 楽観的ロック        |
| Phase 5  | 顧客・ランク管理           | ✅ 詳細編集 / 招待登録 / 宣誓書 / 月次・失効バッチ |
| Phase 6  | 請求・入金管理             | ✅ 発行ウィザード / 入金消込 / 請求 PDF / 領収書   |
| Phase 7  | 通知・レポート             | 🟡 自動発火 + 手動送信 / レポート要強化            |

## 次セッションで埋めるべき箇所 (TODO)

### Phase 2: 商品・在庫管理

- [ ] 商品インライン編集 (掛け率・公開状態・締切)
- [ ] 商品画像アップロード UI (Sharp で 800px リサイズ)
- [ ] 個別ショップへの `rate_override` 設定 UI
- [ ] 商品 CSV エクスポート

### Phase 3: 発注フォーム

- [ ] 商品画像表示・カテゴリフィルタ
- [ ] 残在庫の即時更新 (発注リクエスト後)
- [ ] 免責事項テキストの DB 化 (現在は固定文)
- [ ] スマホレイアウト確認

### Phase 4: 受発注管理

- [ ] `/admin/orders/[id]` 詳細ページ (承認 / 数量配分 / 楽観的ロック反映)
- [ ] 一括承認 (カット割の自動配分)
- [ ] 発送ステータス更新 + 追跡番号
- [ ] オーダー確認リスト (商品ごとの集計画面)

### Phase 5: 顧客・ランク管理

- [ ] `/admin/shops/[id]` 詳細ページ
- [ ] ランク変動履歴
- [ ] 宣誓書アップロード + 失効アラート (Cron)
- [ ] ショップ新規登録ウィザード (Supabase Auth へのユーザー作成も)

### Phase 6: 請求・入金管理

- [ ] 請求書発行ウィザード UI (`/admin/billing/new`)
- [ ] PDF 生成 → Supabase Storage 保存 → `invoices.pdf_url` 更新フロー
- [ ] 入金消込モーダル (一部入金対応)
- [ ] 領収書 PDF
- [ ] 売掛金集計

### Phase 7: 通知・レポート

- [ ] 通知テンプレート編集 UI
- [ ] 一斉送信フォーム (Resend バッチ送信)
- [ ] ランク変動通知の自動発火 (rank-update Cron 内に組み込み)
- [ ] 宣誓書失効アラート Cron
- [ ] レポート期間切替・グラフ
- [ ] Excel エクスポート (SheetJS)

### 横断

- [ ] テスト (Vitest or Playwright)
- [ ] `supabase gen types typescript` で `src/types/database.ts` を自動生成に切替
- [ ] ステージング環境 (Vercel Preview Deploy) 用 Supabase プロジェクト分離
- [ ] CI (GitHub Actions: type-check / lint / build)
- [ ] 旧 `card-order-app` からのデータ移行スクリプト

## 旧システムからの移行メモ

- 顧客マスター (Google Spreadsheet) → `/admin/shops/new` で個別作成 or CSV インポートを実装して一括投入
- 在庫マスター (Google Spreadsheet) → 既存 Excel に転換して `/admin/inventory/import` から投入
- `processShipmentNotification` (GAS + Anthropic API) は廃止 → 通知センターのテンプレート + 手動 / 自動送信に置換

## 重要な実装ポリシー (要件定義より)

1. 掛け率は `numeric (0.74)` で保存、表示時のみ `74%`
2. 金額はすべて `integer (円)`。小数点は `Math.floor` で切り捨て
3. 免責事項同意は `orders.consent_agreed_at` に必ず記録 (NOT NULL)
4. RLS は全テーブルに設定済み。`service_role_key` はサーバーサイドのみ
5. PDF 生成は Node ランタイムで実行 (`export const runtime = "nodejs"`)
6. DELETE 禁止。`UPDATE deleted_at = now()` で論理削除
7. 月次バッチは冪等。`shop_rank_history` は `(shop_id, month)` で UNIQUE
8. 請求書番号採番は Service Role を経由して直列実行
9. 宣誓書 PDF は非公開バケット (`oath-documents`)
10. 本番デプロイ前に Vercel Preview Deploy で動作確認
