# DEMO — Scenario & runbook

> **Status: STUB.** This document is completed during the prototype phase (Phase 3). It captures the agreed demo outline now; the runbook details are filled in once the network and services exist.

## Demo objective

A guided ~10-minute walkthrough showing the full two-tier model:

1. **Central bank issues** SWR to the commercial banks.
2. **Customers** send payments, including a **cross-bank** transfer.
3. **Central bank redeems** SWR.
4. On-screen: customer wallet, central-bank admin console, and the blockchain explorer showing committed blocks [R13].

## Scenario script (draft)

| Step | Actor | Action | Evidence on screen |
|---|---|---|---|
| 1 | CB admin | Issue 10,000 SWR to bank A, 10,000 SWR to bank B | Admin console shows per-bank circulation; explorer shows the issue tx |
| 2 | alice (bank A) | Pay bob 250 SWR (intra-bank) | Wallet balances update; history shows UTXO change-splitting |
| 3 | bob (bank A) | Pay carol (bank B) 100 SWR (cross-bank) | Both banks' balances update after commit |
| 4 | dan (bank B) | Check balance / history | Wallet history |
| 5 | CB admin | Redeem 500 SWR from bank B | Supply drops; explorer shows the redeem/burn tx |
| 6 | Optional | Toggle a customer status to `flagged`; attempt a transfer over the limit and show rejection | Admin + wallet behavior |

## Seed data

- Customers: alice, bob (bank A); carol, dan (bank B).
- Initial balances: bank A 10,000 SWR, bank B 10,000 SWR.
- SWR token: code `SWR`, symbol `रू`, 2 decimal places.

## Runbook (to be completed in Phase 3)

- [ ] Prerequisites and pinned versions (see README).
- [ ] One-command network bring-up (`up`/`down` scripts).
- [ ] Seed script: reset + issue + distribute + transfers + redeem.
- [ ] Port mapping table (token services, FastAPI, React, explorer) [R13].
- [ ] Troubleshooting checklist.

## References

- token-sdk sample startup (`./scripts/up.sh`, `down.sh`, ports, explorer): https://github.com/hyperledger/fabric-samples/tree/main/token-sdk [R13]
