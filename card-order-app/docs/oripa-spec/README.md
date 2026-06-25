# ネットオリパ 機能拡張 仕様書一式

作成日: 2026-06-13（最終更新: 2026-06-18）
分野: ネットオリパ（オンラインくじ）
本ディレクトリは **クライアント別の要望機能** の仕様書・画面イメージmock・mockデータをまとめたものです。

> **クライアントはそれぞれ別企業・別プロダクト**です（共通基盤ではありません）。仕様・デザイン・ブランドは混在させないこと。
>
> | # | クライアント | 本書での対応状況 |
> |---|------------|----------------|
> | 01 | **NOVAガチャ**（ノヴァガチャ様） | ✅ 対応中（争奪戦／裏ボタン／BT消費解放ガチャ／課金限定ガチャBT消費） |
> | 02 | **GRIM** | ✅ 対応中（通知機能／レインボーキードロップ） |
> | 03 | **オリポケ** | ⏳ 別クライアント。本書には未収録（依頼が来たら 03-oripoke として追加） |
>
> ※ GRIMの通知UIの参考にした「オリパワン（oripaone.jp）」は外部の参考事例であり、クライアントではありません。

---

## クライアント別 機能一覧

### 01. ノヴァガチャ様（NOVAガチャ）

| ID | 機能名 | 工数目安 | 仕様書 | mock |
|----|--------|---------|--------|------|
| 01-a | 課金消費型ガチャの **BT消費ガチャ対応** | 3D | [仕様書](01-novagacha/a-bt-consumption-gacha.md) | [mock](mocks/課金限定ガチャBT消費/機能モック.html) |
| 01-b | **BT消費によるガチャ解放機能**（BTロック） | 追加実装 | [仕様書](01-novagacha/b-bt-unlock-gacha.md) | [mock](mocks/BT消費解放ガチャ/機能モック.html) |
| 01-E | **イベント基盤（イベントスペース）** ※福袋/レイド/チーム戦の土台 | 追加依頼 | [仕様書](01-novagacha/events-platform.md) | — |
| 01-c | **福袋争奪戦**（ランキングイベント） | 追加依頼 | [仕様書](01-novagacha/c-event-fukubukuro.md) | [mock](mocks/争奪戦/福袋争奪戦/機能モック.html) |
| 01-d | **レイドイベント**（討伐型・貢献度で高還元ガチャ解放） | 追加依頼 | [仕様書](01-novagacha/d-event-raid.md) | [mock](mocks/争奪戦/対抗戦レイド/機能モック.html) |
| 01-f | **ガチャ演出 裏ボタン**（確定音・GOGOランプ） | 約2.8D | [仕様書](01-novagacha/f-gacha-effect-secret-button.md) | [mock](mocks/裏ボタン/機能モック.html) |

**クライアント共有用 要件定義書（新フォーマット｜設計を含まない／①想定挙動 ②必達キーファンクション ③イレギュラー補完 ④デザイン要件）** — NOVA確定4機能を網羅
- 機能①争奪戦: [req-4 福袋争奪戦（ランキング）](01-novagacha/requirements/req-4-fukubukuro-ranking.md)＋[req-3 対抗戦（レイド）](01-novagacha/requirements/req-3-taikousen-raid.md)
- 機能②: [req-5 ガチャ演出 裏ボタン](01-novagacha/requirements/req-5-gacha-ura-button.md)
- 機能③: [req-2 BT消費ロック解除ガチャ](01-novagacha/requirements/req-2-bt-unlock-gacha.md)
- 機能④: [req-1 課金限定ガチャ バッテリー消費タイプ](01-novagacha/requirements/req-1-bt-consumption-gacha.md)

> ※ 上記「requirements/」は設計を省いたクライアント共有版。`01-novagacha/` 直下の各仕様書は設計メモを含む内部詳細版（実装着手用）。

**機能別mock（機能モック＝ユーザー画面／管理画面制御＝管理画面、必要な画面だけに分割）**
| 機能 | 機能モック | 管理画面制御 |
|------|-----------|-------------|
| 争奪戦：福袋争奪戦 | [機能モック](mocks/争奪戦/福袋争奪戦/機能モック.html) | [管理画面制御](mocks/争奪戦/福袋争奪戦/管理画面制御.html) |
| 争奪戦：対抗戦（レイド） | [機能モック](mocks/争奪戦/対抗戦レイド/機能モック.html) | [管理画面制御](mocks/争奪戦/対抗戦レイド/管理画面制御.html) |
| 裏ボタン | [機能モック](mocks/裏ボタン/機能モック.html) | [管理画面制御](mocks/裏ボタン/管理画面制御.html) |
| BT消費解放ガチャ | [機能モック](mocks/BT消費解放ガチャ/機能モック.html) | [管理画面制御](mocks/BT消費解放ガチャ/管理画面制御.html) |
| 課金限定ガチャBT消費 | [機能モック](mocks/課金限定ガチャBT消費/機能モック.html) | [管理画面制御](mocks/課金限定ガチャBT消費/管理画面制御.html) |

**参考資料（NOVA）**:
- [stg実機（フロント）UIコンポーネント／デザイン情報整理](01-novagacha/design-scan-novagacha.md)（Tailwind+DaisyUI / M PLUS 1p / デザイントークン・全画面マッピング）
- [stg実機（**管理コンソール**）UIコンポーネント／デザイン情報整理](01-novagacha/design-scan-novagacha-console.md)（Chakra UI + Tabler / Supabase / オリパ編集フォーム全項目・4機能の追加先）
- [**NOVA実画面 再現mock**](mocks/nova-actual-screens.html)（stg実機をHTML再現：ログイン〜演出〜マイページ全8画面・実測トークン使用）
- [QA / デバッグ支援ワークフロー](qa-debug-workflow.md)

### 02. GRIM様

| ID | 機能名 | 仕様書 | mock | mockデータ |
|----|--------|--------|------|-----------|
| 02-a | **通知機能**（通知ベル / 3タブ・オリパワン準拠） | [仕様書](02-grim/a-notification.md)・[**要件定義書**](02-grim/a-notification-requirements.md) | [mock](mocks/02a-notification.html) | [notifications.json](mockdata/notifications.json) |
| 02-b | **レインボーキー ガチャドロップ機能** | [仕様書](02-grim/b-rainbow-key-drop.md) | [mock](mocks/02b-rainbow-key-drop.html) | [rainbow-keys.json](mockdata/rainbow-keys.json) |

---

## 用語

| 用語 | 説明 |
|------|------|
| ガチャ / オリパ | ネットオリパの抽選単位。本書では「ガチャ」で統一 |
| コイン | 課金で購入する基本通貨。ガチャの主消費リソース |
| ポイント | 付与・キャンペーン等で配布される副通貨 |
| BT（バッテリー） | 特殊アイテム。ガチャドロップ等で入手し、課金消費ガチャや解放に使用 |
| レインボーキー | GRIM様向け特殊アイテム。ガチャからランダムドロップする救済アイテム |
| 課金消費型ガチャ | 設定課金額を満たすと抽選権を得られる、課金限定のガチャタイプ |
| 還元率 | ガチャの期待リターン率。100%OVER = 投入額以上の期待値 |

---

## 確認済み事項（クライアント回答反映済み）

- **01-b 解放の有効期限**: 設ける → **本仕様では「永続（無期限）」で確定**。将来拡張として有効期限フィールドを予約。
- **01-b 再ロック運用**: **なし**（一度解放したら戻さない）。

## 工数表記について
要望中の「3D」等は **person-day（人日）** の概算見積りを表します。確定見積りは詳細設計後に再提示します。

---

## ディレクトリ構成

```
docs/oripa-spec/
├── README.md                      … 本ファイル（インデックス）
├── 01-novagacha/
│   ├── a-bt-consumption-gacha.md  … 01-a 仕様書
│   └── b-bt-unlock-gacha.md       … 01-b 仕様書
├── 02-grim/
│   ├── a-notification.md          … 02-a 仕様書
│   └── b-rainbow-key-drop.md      … 02-b 仕様書
├── mocks/                         … 画面イメージmock（HTML / ブラウザで開く）
│   ├── 争奪戦/福袋争奪戦/{機能モック.html, 管理画面制御.html}   … NOVA 01-c
│   ├── 争奪戦/対抗戦レイド/{機能モック.html, 管理画面制御.html} … NOVA 01-d
│   ├── 裏ボタン/{機能モック.html, 管理画面制御.html}            … NOVA 01-f
│   ├── BT消費解放ガチャ/{機能モック.html, 管理画面制御.html}    … NOVA 01-b
│   ├── 課金限定ガチャBT消費/{機能モック.html, 管理画面制御.html} … NOVA 01-a
│   ├── nova-actual-screens.html   … NOVA実画面 再現（フロント全8画面）
│   ├── 02a-notification.html      … GRIM 02-a
│   └── 02b-rainbow-key-drop.html  … GRIM 02-b
└── mockdata/                      … mockデータ（JSON）
    ├── notifications.json
    └── rainbow-keys.json
```

> mockはHTML単体ファイルです。ダブルクリックでブラウザ表示できます（ビルド不要）。
