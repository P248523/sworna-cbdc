#!/usr/bin/env bash
#
# Central-bank host deployment.
#
# On the CB host (dev all-in-one, or the CB VM), bring up the settlement
# network, the token engine (issuer+auditor), the banking backend and the
# CB portal.
#
# Usage: ./scripts/deploy-centralbank.sh [--provision]
#   --provision   also generate wallet-pool keys for banks 001/002 (requires
#                 the token CA to be running; creates keys + edits owner confs)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$ROOT/bin:$PATH"
export FABRIC_CFG_PATH="$ROOT/config"

cd "$ROOT/network"

echo "==> [1/5] Fabric network (centralbank + banka, channel settlement)"
./network.sh up createChannel -ca

echo "==> [2/5] Bank B joins the channel"
./network/addOrg3/addOrg3.sh up

echo "==> [3/5] Token chaincode on all 3 orgs"
./network.sh deployCCAAS -ccn tokenchaincode -ccp "$ROOT/token-services/tokenchaincode" -cci init -ccs 1

echo "==> [4/5] Token engine (issuer, auditor)"
cd "$ROOT/token-services"
docker-compose -f compose-ca.yaml up -d          # token CA (idemix issuer)
docker-compose up -d --build issuer auditor

if [ "${1:-}" = "--provision" ]; then
  echo "==> provisioning wallet pools for banks 001/002"
  sleep 10  # let the engine connect
  TOKEN=$(curl -sf -X POST http://localhost:8000/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"cbadmin","password":"sworna-cb"}' | jq -r .token 2>/dev/null || true)
  if [ -n "$TOKEN" ]; then
    for code in 001 002; do
      curl -sf -X POST "http://localhost:8000/api/v1/admin/banks/$code/provision" \
        -H "Authorization: Bearer $TOKEN" || echo "   (provision $code: backend not up yet — run later)"
    done
  else
    echo "   backend not up yet — provision banks from the CB portal later"
  fi
fi

echo "==> [5/5] Banking backend + CB portal"
cd "$ROOT/backend"
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install -q -r requirements.txt
(setsid ./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/sworna-backend.log 2>&1 &)

cd "$ROOT/web"
npm install --silent
(setsid npm run dev > /tmp/sworna-web.log 2>&1 &)

echo
echo "Central-bank host ready."
echo "  portal   http://localhost:5173   (login: cbadmin / sworna-cb)"
echo "  backend  http://localhost:8000/docs"
echo "  engine   http://localhost:8080"