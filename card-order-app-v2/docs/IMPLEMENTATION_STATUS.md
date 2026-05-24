# 実装ステータス詳細

このセッションで作成した全ファイルと、各ファイルが満たしている要件定義書の項目をマップ。

## ファイル一覧 (実装済み)

### Supabase
| ファイル | 目的 |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | 13 テーブル定義 (shops, products, orders, invoices, invoice_items, rank_settings, shop_rank_history, audit_logs, batch_logs, notifications, notification_templates, surveys + RLS 対象全部) |
| `supabase/migrations/002_indexes.sql` | パフォーマンス用 14 個のインデックス (orders shop_status, products visible 等) |
| `supabase/migrations/003_triggers.sql` | `updated_at` 自動更新トリガー (7 テーブル) |
| `supabase/migrations/004_rls_policies.sql` | 全テーブル RLS + `is_admin()` / `is_super_admin()` ヘルパ関数 |
| `supabase/migrations/005_seed.sql` | rank_settings 5 行 + 通知テンプレ 7 種 |
| `supabase/migrations/006_storage_buckets.sql` | 4 バケット (product-images, invoices, oath-documents, survey-reports) |
| `supabase/migrations/007_rpc_functions.sql` | `increment_product_ordered_qty` + shop_rank_history UNIQUE |

### Next.js 設定
| ファイル | 目的 |
|---|---|
| `package.json` | 依存 (next 14.2 / @supabase/ssr / @react-pdf / resend / xlsx / sharp / zod / sentry / tailwind) |
| `next.config.mjs` | Sentry ラップ (DSN なければスキップ) |
| `middleware.ts` | ルートガード (login / admin / mypage の分離) |
| `vercel.json` | Cron 毎月 1 日 00:00 |
| `tailwind.config.ts` / `globals.css` | ブランドカラー + 共通コンポーネント (btn-primary 等) |

### 認証・データアクセス
| ファイル | 目的 |
|---|---|
| `src/lib/supabase/client.ts` | ブラウザ用クライアント |
| `src/lib/supabase/server.ts` | RSC / Route Handler 用 |
| `src/lib/supabase/admin.ts` | Service Role (Cron 等) |
| `src/lib/supabase/middleware.ts` | middleware 用セッション更新 |
| `src/lib/auth.ts` | ロール判定 |
| `src/types/database.ts` | 全テーブル型 |

### ビジネスロジック
| ファイル | 要件定義のどこを実装 |
|---|---|
| `src/lib/rebate.ts` | 掛け率・リベートモデル節 (小計 / リベート / 課税 / 税 / 合計) |
| `src/lib/ranks.ts` | ランク昇降格ルール (即時昇格 + 1ヶ月猶予降格) |
| `src/lib/orders.ts` | 発注単位・下限制御 (BOX 12 / CT 1) + 在庫チェック |
| `src/lib/invoice-number.ts` | INV-YYYYMM-NNNN 採番 |
| `src/lib/dates.ts` | JST 日付ユーティリティ |
| `src/lib/audit.ts` | 操作ログ記録 |
| `src/lib/csv.ts` | UTF-8 BOM 付き CSV |
| `src/constants/ranks.ts` | ランク 5 段階の既定閾値・リベート率 + 税率 |

### 画面 (ショップ)
| URL | 実装ファイル | 状態 |
|---|---|---|
| `/login` | `src/app/login/page.tsx` + `LoginForm.tsx` | ✅ 動作 |
| `/order` | `src/app/(shop)/order/page.tsx` + `OrderForm.tsx` | ✅ カート + 確認モーダル + 免責同意 + リクエスト送信 |
| `/mypage` | `src/app/(shop)/mypage/page.tsx` | ✅ 現ランク / 今月発注額 / 次ランクまで / 直近発注 / 請求書 |

### 画面 (管理者)
| URL | 実装ファイル | 状態 |
|---|---|---|
| `/admin` | `page.tsx` | ✅ KPI 4 種 (今月受注 / 要承認 / 入金待ち / 稼働ショップ) |
| `/admin/inventory` | `page.tsx` | ✅ 一覧 (画像登録・インライン編集は TODO) |
| `/admin/inventory/import` | `ImportForm.tsx` | ✅ Excel 取込 |
| `/admin/orders` | `page.tsx` | ✅ 一覧 (詳細・承認モーダルは TODO) |
| `/admin/shops` | `page.tsx` | ✅ 一覧 (詳細・宣誓書は TODO) |
| `/admin/billing` | `page.tsx` | ✅ 一覧 (発行ウィザード・消込は TODO) |
| `/admin/rebate` | `page.tsx` + `RankSettingsEditor.tsx` | ✅ 閾値編集 + 変動履歴 + 手動実行 |
| `/admin/notifications` | `page.tsx` | ✅ テンプレ + ログ (送信フォームは TODO) |
| `/admin/surveys` | `page.tsx` | ✅ 一覧 (登録フォームは TODO) |
| `/admin/reports` | `page.tsx` | ✅ ショップ別月次 (商品別・期間切替は TODO) |

### API ルート
| エンドポイント | 動作 |
|---|---|
| `GET /api/health` | DB 接続チェック |
| `POST /api/cron/rank-update` | 月次ランク更新 (CRON_SECRET 認証) |
| `POST /api/orders` | 発注リクエスト作成 (免責同意・数量バリデーション・ロックインリベート率) |
| `POST /api/orders/[id]/status` | ステータス更新 (楽観的ロック・在庫補正) |
| `GET /api/orders/export` | CSV |
| `POST /api/invoices` | 請求書発行 (採番・リベート計算・明細作成) |
| `GET /api/invoices/export` | CSV |
| `POST /api/products/import` | Excel 取込 |
| `GET /api/shops/export` | CSV |
| `POST /api/rank-settings` | ランク閾値更新 (super_admin) |

### 外部統合
| ファイル | 目的 |
|---|---|
| `sentry.{client,server,edge}.config.ts` | Sentry 初期化 |
| `src/instrumentation.ts` | Sentry の自動ロード |
| `src/lib/email/resend.ts` | Resend クライアントラッパ |
| `src/lib/email/templates.ts` | `{{key}}` 置換 |
| `src/lib/email/send-template.ts` | テンプレ取得 + 送信 + ログ |
| `src/lib/pdf/invoice.tsx` | 請求書 PDF (案内掛け率 / リベート / 課税 / 税 / 合計 + インボイス) |
| `src/lib/pdf/render.ts` | renderToBuffer ラッパ |
| `src/lib/storage.ts` | 署名付き URL (1 時間 TTL) |

## 動作確認に必要な手順

1. `npm install`
2. Supabase プロジェクト作成 + 001〜007 マイグレーション実行
3. `.env.local` 設定
4. Supabase Auth に admin ユーザーを作成し、SQL Editor で:
   ```sql
   UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"role":"super_admin"}'::jsonb WHERE email = 'admin@example.com';
   ```
5. `npm run dev` → http://localhost:3000

## 既知の制約・前提

- **Supabase 型生成**: 現状の `src/types/database.ts` は手書き。本格運用時は `supabase gen types typescript` で自動生成に置換すること
- **PDF 生成**: 現在は API ルート内ではなく雛形のみ。請求書発行 API を完成させる際に Storage アップロード処理を組み込む
- **トランザクション**: 発注ステータス更新時の在庫補正は RPC 経由。完全な ACID を保証するなら Postgres function に処理全体を移すべき
- **テスト**: 未実装。Vitest + Playwright で再構築推奨
- **CI**: 未設定。GitHub Actions テンプレートは要追加
