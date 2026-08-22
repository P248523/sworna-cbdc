# BENCHMARKS — Performance methodology & Fabric-X evaluation

> **Status: STUB.** Methodological outline only. Executed and reported in Phase 5.

## 1. Objectives

Quantify the Sworna network's throughput and latency on the real lab deployment, identify bottlenecks, and produce a go/no-go view on **Fabric-X** as a higher-throughput track for national-scale CBDC.

## 2. Tooling

- **Hyperledger Caliper** — benchmark framework measuring success rate, transaction/read throughput, transaction/read latency (min/max/avg), and resource consumption (CPU, memory, network IO) for Fabric [R15].
- Metrics definitions follow the PSWG blockchain performance metrics white paper [R15].
- Note: Caliper currently targets the Fabric v2.x Gateway SDK path — compatibility with the v3.x token-sdk services must be verified during setup [R15].

## 3. Benchmark scenarios

| Scenario | Description | What it stresses |
|---|---|---|
| intra-bank transfer | Owners on the same bank node transact | Layer-2 negotiation + chaincode commit |
| cross-bank transfer | Owners on different bank nodes | libp2p inter-node flow + endorsement across orgs |
| mixed workload | Issue/transfer/redeem mix | Full lifecycle + auditor signing |
| high-contention UTXO | Many transfers spending shared/small UTXO pools | UTXO selection, MVCC conflicts, chaincode throughput |

## 4. Metrics

- TPS (committed transactions per second), success rate.
- Latency p50 / p95 / p99 for submit→commit.
- Resource usage per component (orderer, peer, CouchDB, token services).

## 5. Tuning targets (Fabric v3.1) [R1]

- Block size / `BatchTimeout`; `RequestBatch*` parameters (BFT in Phase 4) [R2].
- Chaincode write batching (`chaincode.runtimeParams.useWriteBatch`) and read batching (`GetMultipleStates` / `GetMultiplePrivateData`) — Fabric v3.1 features [R1].
- CouchDB index design for state queries; gossip/fanout settings; gateway settings.

## 6. Fabric-X evaluation track

**Rationale.** Classic Fabric's monolithic peer and consensus architecture cap throughput; **Fabric-X** decomposes the peer into independently scalable endorsement/validation/commit microservices and introduces the **Arma** BFT orderer, benchmarked at **200,000+ TPS** on a UTXO-based CBDC application [R7][R8][R9][R10].

**Plan**

1. Run the Fabric-X samples (UTXO token application) [R16] using the Ansible-based deployment [R17].
2. Benchmark the same scenarios from §3 against classic Fabric.
3. Record the programming-model difference: Fabric-X replaces chaincode with peer-to-peer negotiation protocols built on Fabric Smart Client / Token SDK [R8].
4. Produce a comparison table and a go/no-go ADR (ADR-0013 candidate).

## 7. Deliverables

- `BENCHMARKS.md` final: results tables, bottleneck analysis, tuning recommendations.
- Fabric-X evaluation report + decision ADR.
