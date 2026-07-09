#!/usr/bin/env bash
# 本番サイトの応答時間を計測 (TTFB / 合計時間 / 転送量)。
# 各ルートを1回ウォームアップしてから2回計測し中央値相当(2回目)を表示。
# 使い方: bash scripts/perf-check.sh [BASE_URL]
set -u
BASE="${1:-https://card-order-app-v2.vercel.app}"
ROUTES=(/ /login /api/health /order /admin /mypage /register/existing /reset-password /forgot-password)

echo "対象: $BASE"
printf "%-20s %-6s %-12s %-12s %-10s\n" "ROUTE" "CODE" "TTFB(ms)" "TOTAL(ms)" "SIZE(B)"
printf -- "------------------------------------------------------------------\n"
for r in "${ROUTES[@]}"; do
  curl -s -o /dev/null -m 25 "$BASE$r" >/dev/null 2>&1   # warm up
  out=$(curl -s -o /dev/null -m 25 -w "%{http_code} %{time_starttransfer} %{time_total} %{size_download}" "$BASE$r" 2>/dev/null)
  code=$(echo "$out" | awk '{print $1}')
  ttfb=$(echo "$out" | awk '{printf "%.0f", $2*1000}')
  total=$(echo "$out" | awk '{printf "%.0f", $3*1000}')
  size=$(echo "$out" | awk '{print $4}')
  printf "%-20s %-6s %-12s %-12s %-10s\n" "$r" "$code" "$ttfb" "$total" "$size"
done
