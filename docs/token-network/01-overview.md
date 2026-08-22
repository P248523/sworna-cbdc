# Token network — overview

This series documents the Sworna token network as built in Phase 3: how money is
created, held, moved and destroyed on a **3-organization Hyperledger Fabric**
settlement network with **zero-knowledge privacy** and a central-bank **auditor**.

The network has two layers:

```
  Layer 2  token network   issuer · auditor · owner1 · owner2   (the Go engine)
              │                    │        REST                 
  Layer 1  settlement      peer0.centralbank · peer0.banka · peer0.bankb
              │                    │        channel `settlement`
  ledger     Fabric v3.1.5 · tokenchaincode (ZKAT-DLOG) · Raft orderer
```

## The players

| Role | Runs | Identity | What it does |
|---|---|---|---|
| **Issuer** | central bank | x.509 (token CA) | mints and burns SWR |
| **Auditor** | central bank | x.509 (token CA) | signs/oversees **every** transaction |
| **Owner 1** | Bank A | idemix wallet (alice, bob) | holds and transfers SWR |
| **Owner 2** | Bank B | idemix wallet (carlos, dan) | holds and transfers SWR |
| **Chaincode** | all 3 peers | ZKAT-DLOG params | validates proofs, owns the UTXO ledger |

## Money model

- SWR is a **UTXO token**: money is a set of unspent transaction outputs, each
  with an owner and a hidden amount.
- Amounts and parties are **Pedersen commitments** on the ledger (ZK); only the
  auditor and the transacting parties can open them.
- Two decimal places (off-chain; the ledger stores integer minor units).

## The transaction flow (in one breath)

```
issuer ──issue──► owner1/alice ──transfer──► owner1/bob ──transfer──► owner2/carlos ──redeem──► issuer
          CB mints                intra-bank              cross-bank              CB burns
```

Every step requires the auditor's signature. The ledger only ever records
commitments and zero-knowledge proofs — decoded blocks contain **no** plaintext
amounts or party names (verified in M2).

## Series index

| Doc | Contents |
|---|---|
| [02-transaction-flow](02-transaction-flow.md) | Issue / transfer / redeem step-by-step, with the auditor |
| [03-utxo-zk-model](03-utxo-zk-model.md) | UTXO accounting, change, double-spend, Pedersen commitments, auditor oversight |
| [04-chaincode-params](04-chaincode-params.md) | tokengen public parameters, SWR, identities |
| [05-engine-deep-dive](05-engine-deep-dive.md) | The Go engine (forked from token-sdk), its REST surface, how we own it |
| [06-api-contracts](06-api-contracts.md) | FastAPI ↔ engine contracts |
| [07-research-log](07-research-log.md) | Sources and lessons learned while building |

## Repo layout

```
network/           our 3-org Fabric network (configtx, CAs, compose, scripts)
token-services/    the Go engine (issuer/auditor/owner + tokenchaincode)
backend/           Python FastAPI banking core
web/               React wallet + CB/bank consoles
docs/token-network this series
```