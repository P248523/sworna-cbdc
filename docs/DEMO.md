# DEMO — Scenario & runbook

> **Status: COMPLETE (Phase 3).** Verified on the dev laptop 2026-08-22.

## Demo objective

A guided ~10-minute walkthrough of the full two-tier model with ZK privacy:

1. **Central bank issues** SWR to the commercial banks.
2. **Customers** send payments, including a **cross-bank** transfer.
3. **Central bank redeems** SWR.
4. On-screen: customer wallet, central-bank console (with a live **ledger
   monitor** replacing the v3-incompatible explorer), and balances.

## Scenario script

| Step | Actor | Action | Evidence on screen |
|---|---|---|---|
| 1 | CB admin | Issue 100.00 SWR to each customer via the console | Admin console: total supply + per-bank circulation update |
| 2 | alice (banka) | Pay bob 20.00 SWR (intra-bank) | Wallet balances + history update |
| 3 | bob (banka) | Pay carlos (bankb) 5.00 SWR (cross-bank) | Both banks' balances update after commit |
| 4 | carlos (bankb) | Pay dan 2.50 SWR (cross-bank) | History shows UTXO change-splitting |
| 5 | dan (bankb) | Redeem 1.00 SWR | Supply drops; ledger monitor shows a new block |
| 6 | CB admin | Toggle bob to `frozen`; attempt a transfer → rejected 403 | Bank console + wallet behaviour |
| 7 | Auditor | Open any account's history | Full amounts + parties visible (the privileged ZK view) |

## Running it

```bash
# 0. bring up the stack (see README "Running the stack")
# 1. reset + run the demo scenario:
./scripts/demo.sh
# 2. open the UI
#    http://localhost:5173   (wallet / bank / central-bank tabs)
#    http://localhost:8080   (token-engine API docs)
```

## Port map

| Port | Service |
|---|---|
| 7050 | orderer |
| 7051 / 9051 / 11051 | peers (centralbank / banka / bankb) |
| 7054 / 8054 / 9054 | Fabric CAs |
| 27054 | token CA |
| 9000 / 9100 / 9200 / 9300 | auditor / issuer / owner1 / owner2 |
| 8000 | FastAPI backend |
| 5173 | React UI (dev) |

## Troubleshooting

- **`can't get session` / `communication service not ready`** — the FSC nodes
  need a moment to join the bootstrap (auditor) after restart; wait ~20 s and
  retry.
- **Auditor unhealthy on start** — check `docker logs token-services-auditor-1`;
  the `keys/fabric` mount must resolve (see token-services compose).
- **Issue fails with "recipient identity"** — the P2P resolver hostnames must
  match the compose hostnames (`*.sworna.example.com`).
- Full reset: `./network/network.sh down` (in `network/`), remove
  `token-services/{keys,data}` and re-run bring-up.