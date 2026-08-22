#!/usr/bin/env bash
#
# Sworna banking demo — runs against a running stack.
#
# Assumes: token-services + backend are up and banks 001/002 are provisioned
# (see README bring-up).
set -euo pipefail

BACKEND="${SWORNA_BACKEND:-http://localhost:8000/api/v1}"

echo "==> Sworna CBDC — banking demo"
echo

echo "-> health"
curl -sf http://localhost:8000/healthz >/dev/null && echo "   backend ok"

CB_TOKEN=$(curl -sf -X POST "$BACKEND/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"cbadmin","password":"sworna-cb"}' | jq -r .token)

echo "-> issue 100.00 SWR to the demo accounts"
for acc in SWR-001-00000001 SWR-001-00000002 SWR-002-00000001 SWR-002-00000002; do
  curl -sf -X POST "$BACKEND/admin/issue" -H "Authorization: Bearer $CB_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"to_account\":\"$acc\",\"amount\":\"100.00\",\"reference\":\"demo issue\"}" \
    >/dev/null
  echo "   issued 100.00 SWR -> $acc"
done

echo "-> payments by account number"
curl -sf -X POST "$BACKEND/payments/transfer" -H "Authorization: Bearer $CB_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"from_account":"SWR-001-00000001","to_account":"SWR-001-00000002","amount":"20.00","reference":"lunch"}' >/dev/null
echo "   SWR-001-00000001 -> SWR-001-00000002  20.00 SWR (intra-bank)"

curl -sf -X POST "$BACKEND/payments/transfer" -H "Authorization: Bearer $CB_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"from_account":"SWR-001-00000002","to_account":"SWR-002-00000001","amount":"5.00","reference":"coffee"}' >/dev/null
echo "   SWR-001-00000002 -> SWR-002-00000001   5.00 SWR (cross-bank)"

curl -sf -X POST "$BACKEND/payments/transfer" -H "Authorization: Bearer $CB_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"from_account":"SWR-002-00000001","to_account":"SWR-002-00000002","amount":"2.50","reference":"ticket"}' >/dev/null
echo "   SWR-002-00000001 -> SWR-002-00000002   2.50 SWR (intra-bank)"

echo "-> redeem"
curl -sf -X POST "$BACKEND/payments/redeem" -H "Authorization: Bearer $CB_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"account":"SWR-002-00000002","amount":"1.00","reference":"cash out"}' >/dev/null
echo "   SWR-002-00000002 redeems 1.00 SWR back to the central bank"

echo
echo "==> Balances"
for acc in SWR-001-00000001 SWR-001-00000002 SWR-002-00000001 SWR-002-00000002; do
  b=$(curl -sf "$BACKEND/accounts/$acc/balance" -H "Authorization: Bearer $CB_TOKEN" | jq -r .balance)
  printf "   %-16s %s SWR\n" "$acc" "$b"
done

echo
echo "==> Central-bank overview"
curl -sf "$BACKEND/admin/overview" -H "Authorization: Bearer $CB_TOKEN" | jq -c . | head -c 600
echo
echo "==> Ledger (last blocks)"
curl -sf "$BACKEND/admin/ledger" -H "Authorization: Bearer $CB_TOKEN" | jq -c '{height, blocks: [.blocks[].number]}'

echo
echo "Demo complete."