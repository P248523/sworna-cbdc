#!/usr/bin/env bash
#
# Sworna demo scenario — runs against a running stack.
#
# Assumes: token-services + backend are up (see README bring-up), e.g.
#   network up createChannel -ca  && addOrg3 up && deployCCAAS ... && backend
#
set -euo pipefail

BACKEND="${SWORNA_BACKEND:-http://localhost:8000/api/v1}"

echo "==> Sworna CBDC demo"
echo

echo "-> health"
curl -sf http://localhost:8000/healthz >/dev/null && echo "   backend ok"

echo "-> issue 100.00 SWR to every customer"
for w in alice bob carlos dan; do
  bank=$([ "$w" = "alice" ] || [ "$w" = "bob" ] && echo banka || echo bankb)
  curl -sf -X POST "$BACKEND/admin/issue" \
    -H 'Content-Type: application/json' \
    -d "{\"recipient_wallet\":\"$w\",\"bank_name\":\"$bank\",\"amount\":\"100.00\",\"message\":\"demo issue\"}" \
    >/dev/null
  echo "   issued 100.00 SWR -> $w ($bank)"
done

echo "-> retail transfers"
curl -sf -X POST "$BACKEND/payments/transfer" -H 'Content-Type: application/json' \
  -d '{"from_wallet":"alice","to_wallet":"bob","amount":"20.00","message":"lunch"}' >/dev/null
echo "   alice -> bob    20.00 SWR (intra-bank)"

curl -sf -X POST "$BACKEND/payments/transfer" -H 'Content-Type: application/json' \
  -d '{"from_wallet":"bob","to_wallet":"carlos","amount":"5.00","message":"coffee"}' >/dev/null
echo "   bob   -> carlos  5.00 SWR (cross-bank)"

curl -sf -X POST "$BACKEND/payments/transfer" -H 'Content-Type: application/json' \
  -d '{"from_wallet":"carlos","to_wallet":"dan","amount":"2.50","message":"ticket"}' >/dev/null
echo "   carlos -> dan    2.50 SWR (cross-bank)"

echo "-> redeem"
curl -sf -X POST "$BACKEND/payments/redeem" -H 'Content-Type: application/json' \
  -d '{"wallet":"dan","amount":"1.00","message":"cash out"}' >/dev/null
echo "   dan redeems 1.00 SWR back to the central bank"

echo
echo "==> Balances"
for w in alice bob carlos dan; do
  b=$(curl -sf "$BACKEND/customers/$w/balance" | jq -r '.balance')
  printf "   %-7s %s SWR\n" "$w" "$b"
done

echo
echo "==> Central-bank overview"
curl -sf "$BACKEND/admin/overview" | jq -c .
echo
echo "==> Ledger (last blocks)"
curl -sf "$BACKEND/admin/ledger" | jq -c '{height, blocks: [.blocks[].number]}'

echo
echo "Demo complete. UI: http://localhost:5173"