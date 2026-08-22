# ADR-0010: Own the token layer — fork the sample, Python owns the business logic

**Status:** Accepted
**Date:** 2026-08-22
**Applies to:** Phase 3 (prototype demo) — replaces the letter of ADR-0001/0005

## Context

Phase 2 de-risking proved the token-sdk stack works on Fabric v3.1.5, but also
proved two things: (1) the sample is version-sensitive — it would not build on
current toolchains until we pinned `quic-go v0.38.1`, `gnark-crypto v0.9.1`,
`qpack v0.4.0`, `go 1.24` and `golang:1.24`; and (2) the team decided the core
system should be **owned by us** rather than consumed as a live sample checkout,
with the API built ourselves.

The ZK privacy requirement (hidden amounts + parties + auditor) has **no Python
implementation**, and Fabric chaincode must be Go/Node/Java. Reimplementing the
ZK scheme from scratch is a multi-month crypto project with severe bug risk.

## Decision

1. **Keep the Fabric Token SDK as a pinned library** (the crypto engine). Do
   not reimplement ZK.
2. **Fork the `token-sdk` sample services into `token-services/` and own them.**
   Bake in the build fixes, pin all versions, wire them to our 3-org network
   (`settlement` channel; issuer/auditor on the CB peer, owner1 on banka, owner2
   on bankb).
3. **Python (FastAPI) owns all business logic** — the banking core, wallets,
   AML-lite, admin, and the API. Go is confined to the engine + the (unchanged,
   upstream) chaincode.
4. **Drop the upstream explorer** (v3-incompatible) in favor of a custom ledger
   monitor in the CB console.

## Consequences

**Positive:** real, audited ZK privacy in v1; a fully Python-owned banking core;
the engine is reproducible and version-pinned; no dependence on a live
`fabric-samples` checkout.
**Negative/risks:** we still depend on the SDK's crypto (accepted — it is the
technology, not "the sample"); the engine's Go surface needs a Go-literate
maintainer for upgrades; upgrading the SDK later may require re-applying build
pins (documented in `docs/token-network/05`).

## References

- Phase-2 de-risking report: README §Phase 2
- Research log: docs/token-network/07-research-log.md
- Engine deep-dive: docs/token-network/05-engine-deep-dive.md