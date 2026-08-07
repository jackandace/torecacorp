# 変更履歴 (重要な仕様変更のログ)

運用に影響する仕様変更を日時付きで記録する。番号の大きいものが新しい。

---

## 2026-08-07 監査ログ・通知メールの RLS 権限バグを修正 (Service Role へ内部昇格)

**変更日時**: 2026-08-07（JST）
**きっかけ**: Supabase ログに `42501 new row violates row-level security policy` (audit_logs / notifications) を検知

### 問題

`audit_logs` / `notifications` / `notification_templates` の RLS は admin のみ許可だが、
ショップ・問屋・公開コンテキストの API がセッション権限のまま書き込んでいた。

- ショップ操作 (発注・振込報告・プロフィール変更等) の**監査ログが静かに欠落**
- ショップ発注時の受領メール等、**テンプレート読込が RLS に阻まれメール自体が不達**の可能性
  (スタッフ向け通知はテンプレ非依存のためメールは届いており、送信記録のみ欠落)

### 修正

`writeAudit` / `notifyShop` / `notifyOrderToStaff` / `notifyPaymentReportToStaff` の内部で
常に Service Role クライアントを使うよう変更 (呼び出し元の権限に依存しない)。
RLS ポリシー自体は変更なし (ショップに書き込み権限を開けるより安全)。

---

## 2026-08-07 ショップの「振込完了報告」→「支払い確認中」表示を追加

**変更日時**: 2026-08-07（JST）
**背景**: ショップ要望「支払い完了ボタンと支払い確認中ステータスがあると支払い漏れ確認がしやすい」

### 変更内容

- ショップのマイページ請求書詳細に「**振込完了を報告する**」ボタン（任意メモ付き）を追加
- 報告済み・未消込の請求書は双方の画面で「**支払い確認中**」バッジ表示
- 管理画面の請求一覧に「🔔 支払い確認中」タブを追加
- 請求詳細に報告日時・メモの表示 + 誤報告クリアボタン
- **報告時に社内スタッフへメール通知**（宛先: `ORDER_NOTIFY_EMAILS`、初回報告時のみ送信）

### 設計上のポイント（壊れない設計）

- `invoices.status`（未入金/一部入金/入金済み）は**一切変更しない**。
  「支払い確認中」は `payment_reported_at IS NOT NULL AND status <> '入金済み'` からの**導出表示**
- 管理者が消込して入金済みになると確認中表示は自然に消える（状態同期処理なし）
- 返金・legacy・入金済み請求書は報告不可。再報告は冪等（メール再送なし）

### あわせて必要な作業

- **DBマイグレーション**: [supabase/migrations/031_payment_report.sql](../supabase/migrations/031_payment_report.sql) を SQL Editor で実行（カラム2つ+部分インデックス追加のみ・既存に無影響）

---

## 2026-07-28 テストデータ(2026-07-15 以前の発注・請求)のアーカイブ

**変更日時**: 2026-07-28（JST）

2026-07-15 以前(JST)に作成された発注・請求データはテストデータのため、
[supabase/maintenance/2026-07-28_archive_test_data.sql](../supabase/maintenance/2026-07-28_archive_test_data.sql)
でソフトデリート(`deleted_at` セット)してアーカイブ。

- 完全削除ではないため DB には残る。復元手順はスクリプト末尾に記載
- 管理画面の一覧・KPI・レポート・売上予測・ランク集計・ショップのマイページは
  すべて `deleted_at IS NULL` で絞られているため、集計から完全に除外される
- 「確定」済みテスト発注が加算していた `products.ordered_qty`(発注済数)も同時に戻す

---

## 2026-07-28 保証金(前受金)率のデフォルトを 50% → 30% に変更

**変更日時**: 2026-07-28（JST）
**対象**: カット品の保証金(前受金)請求

### 変更内容

| 項目 | 変更前 | 変更後 |
|---|---|---|
| デフォルト保証金率 (`DEPOSIT_RATE`) | 50% | **30%** |
| ショップ発注時の自動発行 | 常に 50% 固定 | 既定率 30% で発行 |
| 管理画面の手動発行 | 既定 50%（30/40/50% 選択可） | 既定 **30%**（30/40/50% 選択可） |
| 率の保存 | 保存されない | `invoices.deposit_rate` に保存 |
| 請求詳細画面 | 保証金額のみ表示 | 満額(税抜)・保証金率・保証金額の内訳を表示。リベート率は「—（最終精算時に適用）」表記に |
| 請求書 PDF | 「保証金50%分」固定文言 | 発行時の率を動的表示 + 対象金額(満額)を併記 |

### あわせて必要な作業

- **DB マイグレーション**: [supabase/migrations/030_deposit_rate.sql](../supabase/migrations/030_deposit_rate.sql) を Supabase SQL Editor で実行すること。
  - `invoices.deposit_rate` カラム追加
  - 過去の保証金請求書は「保証金額 ÷ 満額」から率を推定してバックフィル
- 過去発行分の PDF は再生成（「PDFを再生成」ボタン）で新レイアウトに更新される。

### 背景

数量の多いカット発注で 50% 前受は負担が大きく返金も発生しやすいため、既定を 30% に引き下げ。
50%/40% は発行時のプルダウンで引き続き選択可能。

### 関連ファイル

- `src/lib/deposit.ts`（既定率・推定ヘルパー）
- `src/app/api/orders/route.ts`（発注時の自動発行）
- `src/app/api/orders/[id]/deposit-invoice/route.ts`（手動発行）
- `src/app/admin/orders/[id]/DepositInvoiceButton.tsx`（発行 UI）
- `src/app/admin/billing/[id]/page.tsx`（請求詳細）
- `src/lib/pdf/invoice.tsx` / `src/lib/pdf/generate-invoice.ts`（PDF）
- ショップ向け文言: 発注フォーム / 発注詳細 / マイページ
- マニュアル: `docs/MANUAL_ADMIN.md` / `src/manuals/admin.ts`
