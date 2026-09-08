# オリパレード デザインプレビュー

オリパレードの既存素材を使った、PC・スマートフォン対応のUIコンポーネント集です。

- 全画面一覧: `/design-system/`
- 設計と実装範囲: [docs/DESIGN-HANDOFF.md](docs/DESIGN-HANDOFF.md)
- 画面構成: `app/`
- デザインCSS: `app/globals.css`
- 画像: `public/assets/`

## 開発

Node.js 22.13以降。`npm ci` 後に `npm run dev`。
`npm run build` で静的HTML・CSS・JavaScriptを出力します。

プレビュー用の独立した実装です。決済・抽選・発送や本番アカウントへの書き込みは行いません。

## 最新デザインと確認ページ

公開プレビュー: https://ori-parade-pop-design.ja-project93.chatgpt.site/oripa/All

- `/oripa/All`: ガチャ一覧
- `/oripa/Pokemon/22`: ガチャ詳細（1／10／100連）
- `/choice-gacha`: 分岐選択 → 専用ガチャ
- `/step-up`: 奥行きのあるステップ表示 → サンプル結果 → 次のSTEP
- `/mypage`: マイページ

共通レイアウトは `app/reference-layout.css`、最終配色・フォントは `app/candy-theme.css` です。
白背景・コーラルのアクセント・白地の枠線ボタンを使用しています。

## GitHub Pages

https://jackandace.github.io/torecacorp/ori-parade-redesign/

`npm run build:pages` でサブディレクトリ対応の静的ページをこのフォルダへ生成します。生成物もGitに含めて公開します。
元のSites公開は独立して維持されています。
