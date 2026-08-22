# Sworna CBDC

**Sworna** is a prototype Central Bank Digital Currency (CBDC) system built on **Hyperledger Fabric**, modeling a two-tier retail + wholesale payment system for the **Nepali rupee** concept. The currency is represented on-ledger as **UTXO tokens protected by Zero-Knowledge Proofs** — amounts and parties remain hidden to the ledger while remaining provably valid, with a central-bank-operated **auditor** enforcing oversight.

> **Project status: Phase 1 — Documentation.** This repository currently contains the planning and architecture documentation only. No prototype code has been written yet. See [docs/PHASES.md](docs/PHASES.md).

---

## Project goal

- **Phase 1 (now):** A complete, research-backed documentation set that defines what we will build (this `docs/` folder).
- **Later phases:** A working prototype — a Fabric network (central bank + commercial banks + customers), a token layer for issuing/transferring/redemption, a Python banking backend, and wallet + central-bank admin UIs — evolving into a comprehensive banking system with benchmarks.

## Locked decisions

| Area | Decision |
|---|---|
| Currency | Token code **SWR**, symbol **रू**, name "Sworna", **2 decimal places** |
| CBDC model | Hybrid **retail + wholesale**, **two-tier** distribution (ADR-0008) |
| Money model | **Token-based / UTXO** with **Zero-Knowledge Proofs** (ADR-0006) |
| Framework | **Hyperledger Fabric v3.1.x** (chaincode layer) |
| Ordering | **Raft** for the initial prototype → **SmartBFT (BFT)** in the comprehensive phase (ADR-0003) |
| Channels | Single `settlement` channel for the prototype → multiple channels later (ADR-0002) |
| Organizations | `centralbank` (CentralBankMSP), `banka` (BankAMSP), `bankb` (BankBMSP); customers are wallet identities on bank owner nodes |
| Roles | Central bank = **issuer + auditor**; commercial banks = **owner** nodes (ADR-0004) |
| Token layer | Reuse the **fabric-samples `token-sdk`** sample (prebuilt chaincode + REST services) (ADR-0001) |
| On-chain language | **Go** (prebuilt token-sdk chaincode, ~zero custom Go) |
| Off-chain language | **Python (FastAPI)** — on-chain only, REST is the boundary (ADR-0005) |
| State DB | **CouchDB** (ADR-0007) |
| Frontend | **React SPA** (customer wallet + central-bank/bank admin consoles) |
| Domain | `sworna.example.com` |
| Deployment | Laptops first, then distributed across the 25-machine lab (8–16 GB RAM / 4–8 cores each) |
| Benchmarking | **Hyperledger Caliper** (comprehensive phase) |

## Documentation map

| Document | Contents |
|---|---|
| [docs/OVERVIEW.md](docs/OVERVIEW.md) | **Team-facing plain-language overview** (no citations) — start here to explain the project to anyone |
| [docs/PHASES.md](docs/PHASES.md) | The full phased roadmap: documentation → foundation → prototype demo → comprehensive system → performance/hardening → vision |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architectural design: two-tier model, UTXO + ZK, roles, network topology, transaction flows, deployment |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | How the single repo is deployed so machines act as central bank / banks / customers; ports, identity, 1→3→25-host progression |
| [docs/FULL-BANKING-SYSTEM.md](docs/FULL-BANKING-SYSTEM.md) | The complete banking-system subsystem map (ledger core, central bank, commercial bank, retail, compliance, infrastructure) |
| [docs/API.md](docs/API.md) | REST API catalog: FastAPI banking layer + token-sdk service endpoints |
| [docs/TEAM.md](docs/TEAM.md) | How the development team is divided: tracks, code ownership, API contracts, weekly plan |
| [docs/DEMO.md](docs/DEMO.md) | Demo scenario and runbook (stub — completed during the prototype phase) |
| [docs/BENCHMARKS.md](docs/BENCHMARKS.md) | Performance benchmarking methodology (Caliper) and Fabric-X evaluation notes (stub) |
| [docs/REFERENCES.md](docs/REFERENCES.md) | Canonical bibliography of every source used for this plan |
| [docs/ADRs/](docs/ADRs/) | Architecture Decision Records (0001–0009) |

## How to read this repository

1. Share [docs/OVERVIEW.md](docs/OVERVIEW.md) with the team first — it explains the whole project in plain language.
2. Start with [docs/PHASES.md](docs/PHASES.md) to understand where we are and where we are going.
3. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design rationale.
4. Reference [docs/REFERENCES.md](docs/REFERENCES.md) for all primary sources.
5. Each decision is captured in its own ADR under [docs/ADRs/](docs/ADRs/).
