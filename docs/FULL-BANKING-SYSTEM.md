# FULL-BANKING-SYSTEM — Sworna subsystem map

The complete banking system we are building toward. This is the target reference; each subsystem is tagged with the phase in which it is implemented. Phase-1 (prototype demo) items are **bold**.

Phases: **P1** = prototype demo, **P2** = comprehensive system, **P3** = performance/hardening, **P4** = future vision.

---

## A. Ledger & money core

| ID | Subsystem | Phase | Notes |
|---|---|---|---|
| A1 | **Currency lifecycle: mint/issue, transfer, redeem/burn** | **P1** | Provided by the token-sdk sample's issue/transfer/redeem REST flows; UTXO + ZK [R13] |
| A2 | **Currency configuration (SWR, 2 decimals)** | **P1** | Token type definition; denominations |
| A3 | Token types (retail SWR, wholesale SWR, future stable-assets) | P2 | Multi-token support exists in the token-sdk sample [R13] |
| A4 | Swap / atomic exchange | P2 | token-sdk already supports swaps [R12][R13] |
| A5 | Ledger snapshots / channel join-from-snapshot | P3 | Fabric v2.5+ feature [R1][R5] |

## B. Central bank functions

| ID | Subsystem | Phase | Notes |
|---|---|---|---|
| B1 | **Issuer console: issue to banks, redeem from banks** | **P1** | Admin console + issuer node |
| B2 | **Supervision view: total supply, per-bank circulation** | **P1** | From auditor node + FastAPI aggregation |
| B3 | Reserve & liquidity management (bank reserve accounts, intraday) | P2 | Per-bank reserve tracking |
| B4 | Monetary policy tools: interest/remuneration, holding limits, standing facilities | P2 | ADR-0011 interest model; limits enforced at auditor layer |
| B5 | Wholesale settlement / RTGS-style interbank transfers | P2 | Modeled on Project Agila's interbank use case [R18][R19] |
| B6 | Regulation, reporting & stress reports | P2 | Money supply, velocity, per-bank stats |

## C. Commercial bank functions

| ID | Subsystem | Phase | Notes |
|---|---|---|---|
| C1 | **Customer & account registry** | **P1** | FastAPI backend (SQLite) |
| C2 | **Bank console: list customers, balances, activity** | **P1** | React; data from FastAPI |
| C3 | Retail wallet issuance & management | P1 | idemix wallet identities on owner nodes [R13] |
| C4 | Interbank operations: funding, settlement, liquidity | P2 | Wholesale flows |
| C5 | Bank-side fraud monitoring & transaction limits | P2 | Rules at auditor + backend alerts |
| C6 | Reconciliation & statements | P2 | From owner-node transaction history |

## D. Retail customer functions

| ID | Subsystem | Phase | Notes |
|---|---|---|---|
| D1 | **Wallet SPA: send, receive, balance, history** | **P1** | React; FastAPI aggregation |
| D2 | Request money, QR payments, merchant payments | P2 | — |
| D3 | Top-up / deposit & cash-out / redeem flows | P2 | Links retail to wholesale |
| D4 | Statements, notifications | P2 | — |
| D5 | Offline payments (research) | P4 | Vision |

## E. Compliance, risk & regulation

| ID | Subsystem | Phase | Notes |
|---|---|---|---|
| E1 | **Basic AML flags (demo-level)** | **P1** | Account status: active / flagged / frozen; backend transfer-limit check |
| E2 | KYC/KYB onboarding workflows | P2 | Bank-staff approval; off-chain documents |
| E3 | Transaction monitoring, sanctions/watchlist, travel rule | P2 | Enforced at the auditor layer — auditor signs every transaction [R13] |
| E4 | Freeze / unfreeze / legal holds | P2 | Auditor-enforced exclusion; owner nodes refuse to spend frozen tokens |
| E5 | Suspicious activity detection & reporting | P2 | Backend rules + auditor data |
| E6 | Full audit trail & forensics | P2 | Auditor sees all values; ledger is append-only |

## F. Supporting infrastructure

| ID | Subsystem | Phase | Notes |
|---|---|---|---|
| F1 | **REST API layer + FastAPI backend** | **P1** | See [API.md](API.md) |
| F2 | **Blockchain explorer** | **P1** | Ships with the token-sdk sample [R13] |
| F3 | Identity & certificate management (Fabric CA per org, idemix) | P1 → P2 hardening | `-ca` pattern [R3] |
| F4 | Monitoring / observability (Prometheus/Grafana) | P2 | Fabric metrics via Operations Service [R2] |
| F5 | API gateway, OIDC auth, rate limiting | P2 | Role-based access |
| F6 | CI/CD, backups/DR, ledger snapshots | P2–P3 | Snapshot/join [R5] |
| F7 | **Performance benchmarking (Caliper)** | **P3** | See [BENCHMARKS.md](BENCHMARKS.md) [R15] |
| F8 | HSM key management, production hardening | P4 | Vision |

---

## Phase mapping (which phase builds which letter)

- **Phase 1 (P1):** A1–A2, B1–B2, C1–C3, D1, E1, F1–F3.
- **Phase 2 (P2):** A3–A4, B3–B6, C4–C6, D2–D4, E2–E6, F4–F6.
- **Phase 3 (P3):** A5, F7; hardening and benchmarks.
- **Phase 4 (P4):** D5, F8; production vision.
