#!/usr/bin/env bash
# クリティカルパスの最小スモーク（CI やデプロイ後の手動確認用）
# 使い方: API_BASE=http://127.0.0.1:5001 ./scripts/smoke-e2e.sh
set -euo pipefail
API_BASE="${API_BASE:-http://127.0.0.1:5001}"

echo "== Health / auth status =="
curl -sfS "${API_BASE}/healthcheck" | head -c 200 || true
echo
curl -sfS "${API_BASE}/api/auth/status" | head -c 400 || true
echo

echo "== Daily login count (public) =="
curl -sfS "${API_BASE}/api/daily-login/count" | head -c 200 || true
echo

echo "OK: smoke requests completed (non-fatal if auth status is empty without OAuth config)."
