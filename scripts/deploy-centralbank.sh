#!/usr/bin/env bash
#
# Central-bank host deployment.
#
# On the CB host (dev all-in-one, or the CB VM), bring up the settlement
# network, the token engine (issuer+auditor), the banking backend and the
# CB portal.
#
# Usage: ./scripts/deploy-centralbank.sh [--provision] [--distributed]
#   --provision    also generate wallet-pool keys for banks 001/002 (requires
#                  the token CA to be running; creates keys + edits owner confs)
#   --distributed  distributed mode: the bank peers/CAs/chaincode are NOT run
#                  on the CB host. After the network + chaincode are set up they
#                  are stopped here and each bank's join bundle is exported to
#                  dist-bank-bundles/ for scp to the bank VMs. Set SWORNA_BANKA_HOST /
#                  SWORNA_BANKB_HOST to also wire the CB engine to the bank owners.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="$ROOT/bin:$PATH"
export FABRIC_CFG_PATH="$ROOT/config"

DISTRIBUTED=0
PROVISION=0
for arg in "$@"; do
  case "$arg" in
    --distributed) DISTRIBUTED=1 ;;
    --provision)   PROVISION=1 ;;
  esac
done

cd "$ROOT/network"

echo "==> [1/5] Fabric network (centralbank + banka, channel settlement)"
./network.sh up createChannel -ca

echo "==> [2/5] Bank B joins the channel"
./network/addOrg3/addOrg3.sh up

echo "==> [3/5] Token chaincode on all 3 orgs"
./network.sh deployCCAAS -ccn tokenchaincode -ccp "$ROOT/token-services/tokenchaincode" -cci init -ccs 1

echo "==> [4/5] Token engine (issuer, auditor)"
cd "$ROOT/token-services"
docker compose -f compose-ca.yaml up -d          # token CA (idemix issuer)

# A fresh clone has no identities (keys/ is gitignored). Enroll the FSC node
# identities + demo wallets once, before the engine starts.
if [ ! -d "$ROOT/token-services/keys/issuer/fsc" ]; then
  echo "==> enrolling token identities (fsc nodes + demo wallets)"
  for i in $(seq 1 30); do
    if curl -sf http://localhost:27054/cainfo >/dev/null 2>&1; then break; fi
    sleep 2
  done
  ./scripts/enroll-users.sh
fi

COMPOSE_FILES="-f docker-compose.yaml"
if [ "$DISTRIBUTED" = "1" ] && [ -n "${SWORNA_BANKA_HOST:-}" ] && [ -n "${SWORNA_BANKB_HOST:-}" ]; then
  COMPOSE_FILES="-f docker-compose.yaml -f docker-compose.net.yaml"
fi
docker compose $COMPOSE_FILES up -d --build issuer auditor

if [ "$PROVISION" = "1" ]; then
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

if [ "$DISTRIBUTED" = "1" ]; then
  echo "==> [6/6] Distributed mode: moving the banks off this host"
  cd "$ROOT/network"
  echo "   stopping bank peers/CAs/chaincode on the CB host (they run on bank VMs)"
  docker rm -f peer0.banka.sworna.example.com peer0.bankb.sworna.example.com \
    ca_org2 ca_org3 peer0org2_tokenchaincode_ccaas peer0org3_tokenchaincode_ccaas 2>/dev/null || true
  ./scripts/export-join-bundles.sh
  echo
  echo "Bank join bundles exported to $ROOT/dist-bank-bundles/ — scp each to its bank VM."
fi

echo
echo "Central-bank host ready."
echo "  portal   http://localhost:5173   (login: cbadmin / sworna-cb)"
echo "  backend  http://localhost:8000/docs"
echo "  engine   http://localhost:8080"