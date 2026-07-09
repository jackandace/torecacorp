#!/usr/bin/env bash
# 全検証プロセス: 変更をかけたら毎回これを通す。
#   1) 型チェック (tsc)  2) ユニットテスト (vitest)  3) 本番ビルド (next build)
# 使い方: bash scripts/verify.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> 1/3 型チェック (tsc --noEmit)"
./node_modules/.bin/tsc --noEmit
echo "    OK"

echo "==> 2/3 ユニットテスト (vitest run)"
npm test --silent
echo "    OK"

echo "==> 3/3 本番ビルド (next build)"
./node_modules/.bin/next build | tail -40

echo ""
echo "✅ 全検証プロセス 完了 (tsc / test / build すべて成功)"
