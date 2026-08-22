#!/usr/bin/env bash
#
# Run the three banking portals under distinct URLs (production build via
# `vite preview`, so each portal's default route is baked in):
#   central-bank   http://localhost:8081
#   Bank A         http://localhost:8082
#   Bank B         http://localhost:8083
# All three proxy /api to the shared backend (:8000).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB="$ROOT/web"

for pid in $(ss -ltnp 2>/dev/null | rg ':(5173|8081|8082|8083)' | rg -o 'pid=[0-9]+' | cut -d= -f2 | sort -u); do
  kill "$pid" 2>/dev/null || true
done
sleep 1

cd "$WEB"
[ -d node_modules ] || npm install --silent

echo "==> building the three portals (env baked in)"
npm run build -- --mode portal-cb --outDir dist-cb     > /tmp/sworna-build-cb.log     2>&1
npm run build -- --mode portal-banka --outDir dist-banka > /tmp/sworna-build-banka.log 2>&1
npm run build -- --mode portal-bankb --outDir dist-bankb > /tmp/sworna-build-bankb.log 2>&1

echo "==> serving"
setsid npx vite preview --outDir dist-cb     --port 8081 > /tmp/sworna-portal-cb.log     2>&1 &
setsid npx vite preview --outDir dist-banka  --port 8082 > /tmp/sworna-portal-banka.log  2>&1 &
setsid npx vite preview --outDir dist-bankb  --port 8083 > /tmp/sworna-portal-bankb.log  2>&1 &

sleep 4
echo "Portals:"
for p in 8081 8082 8083; do
  printf "  http://localhost:%s  " "$p"
  curl -s -o /dev/null -w "%{http_code}\n" --max-time 5 "http://localhost:$p/"
done