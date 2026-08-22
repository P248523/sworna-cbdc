# ADR-0002: Single `settlement` channel in Phase 1; multiple channels later

**Status:** Accepted
**Date:** 2026-08-18
**Applies to:** Phase 3 (prototype demo)

## Context

The token-sdk sample is pre-configured for the Fabric test network, which uses a single channel [R3][R13]. A multi-channel design (e.g., separate settlement, retail, and registry/KYC channels) adds substantial setup effort and risk. The 2-week prototype deadline favors simplicity.

## Decision

Phase 3 uses a single `settlement` channel on which all three organizations (centralbank, banka, bankb) participate. Phase 4 introduces multiple channels (`settlement` + `retail` + `registry/KYC`) and Private Data Collections for customer private data.

## Consequences

**Positive:** minimal topology, matches the token-sdk sample, fast to bring up; all orgs can transact with each other from day one.
**Negative/risks:** no per-channel isolation in Phase 1; privacy relies on the ZK proofs and the auditor model (ADR-0006) rather than channel separation; channel reconfiguration is deferred work.

## References

- Fabric test network (single-channel conventions): https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html [R3]
- token-sdk sample (single-channel deployment): https://github.com/hyperledger/fabric-samples/tree/main/token-sdk [R13]
