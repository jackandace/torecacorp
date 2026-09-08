# GRIM リニューアル モック

閲覧：https://jackandace.github.io/torecacorp/grim-renewal/
マイページ：https://jackandace.github.io/torecacorp/grim-renewal/mypage/
管理画面：https://jackandace.github.io/torecacorp/grim-renewal/admin/

2026-09-08 最新版。ブラウザ内の画面・操作確認用です。実際の決済・景品付与・配送は発生しません。管理画面もサンプルです。
基準ソース：3c6c9a8c0224849a698c3158b244b8884ec13c92（Sites版28）。
GitHub Pagesのサブディレクトリ配信用にbase URL・リンク・ルート解決のみ調整しています。

## 編集
HTML/CSS/JSとassetsが編集元です。追加npm依存はありません。
`node build.mjs` で dist を再生成できます。GitHub Pagesはこのフォルダ内のファイルを直接配信しています。HTML構造を変更した場合は生成後のdist内容を本フォルダに反映してください。
ローカルではリポジトリの親にtorecacorpフォルダを配置し、その親で `python3 -m http.server 8080` を実行すると公開と同じURL構造になります。
`http://localhost:8080/torecacorp/grim-renewal/`

要望書・社内仕様書・法務照会書は公開フォルダに含めていません。エンジニア向け引継ぎZIPを参照してください。
