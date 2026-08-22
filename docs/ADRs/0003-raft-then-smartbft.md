# ADR-0003: Raft ordering for Phase 1; migrate to SmartBFT in Phase 4

**Status:** Accepted
**Date:** 2026-08-18
**Applies to:** Phase 3 → Phase 4

## Context

Fabric v3.0 introduced a Byzantine Fault Tolerant (BFT) ordering service (SmartBFT) that tolerates malicious behavior in up to (but not including) one third of orderers [R1][R11]. BFT requires channel capability **V3_0** and a cluster of **4 consenters** configured via `ConsenterMapping`, with nodes identified by enrollment certificates [R1][R2]. The token-sdk sample and the standard test network use single-node Raft [R3][R13]. For a 2-week prototype, Raft is the most reliable and best-documented option.

Note: ZK proofs (ADR-0006) are chaincode-side and orthogonal to the ordering service — ZK works identically under Raft and SmartBFT.

## Decision

Phase 3 uses a 3-node **Raft** ordering cluster. Phase 4 migrates to **SmartBFT** with 4+ consenters and V3_0 channel capabilities, once the multi-channel and distributed topologies are in place.

## Consequences

**Positive:** simple, reliable demo; matches sample/tutorial defaults; ZK behavior unchanged by consensus choice.
**Negative/risks:** Raft tolerates crashes but not malicious orderers; migration requires channel capability upgrade and reconfiguration of the consenter set, best done in a maintenance window [R2].

## References

- Fabric "What's new" (v3.0 SmartBFT, V3_0 capabilities): https://hyperledger-fabric.readthedocs.io/en/latest/whatsnew.html [R1]
- BFT ordering service configuration: https://hyperledger-fabric.readthedocs.io/en/latest/bft_configuration.html [R2]
- Test network BFT flag (`network.sh up -bft` → 4 orderers): https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html [R3]
- SmartBFT paper: https://arxiv.org/abs/2107.06922 [R11]
